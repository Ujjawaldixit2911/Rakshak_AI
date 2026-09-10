"""
router.py
FastAPI router for Emergency POI Module.
Provides GET /api/emergency/nearby, GET /api/emergency/pois, POST /api/emergency/sync.
"""
import math
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from .models import EmergencyPOI
from .overpass_sync import sync_emergency_pois

router = APIRouter(prefix="/api/emergency", tags=["Emergency POI Module"])

POIType = Literal["police", "hospital", "fire_station", "pharmacy"]

class EmergencyPOIItem(BaseModel):
    id: int
    name: str
    type: str
    latitude: float
    longitude: float
    source: str = "Overpass API (OSM)"
    phone: Optional[str] = None
    city: str = "Delhi"

class NearbyEmergencyPOIItem(EmergencyPOIItem):
    distanceKm: float

class SyncPOIRequest(BaseModel):
    city: str = "Delhi"
    lat: Optional[float] = None
    lng: Optional[float] = None
    radiusKm: float = 15.0
    forceSeed: bool = False

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlam = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    return round(2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 3)

# In standalone setup, get_db dependency can be injected
async def get_db_stub():
    raise NotImplementedError("Database session dependency must be provided by host app")

@router.get("/nearby", response_model=List[NearbyEmergencyPOIItem])
async def get_nearby_emergency_pois(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
    radiusKm: float = Query(5.0, gt=0.0, le=50.0),
    type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db_stub)
) -> List[NearbyEmergencyPOIItem]:
    delta_lat = radiusKm / 110.0
    delta_lon = radiusKm / (110.0 * max(0.1, math.cos(math.radians(lat))))

    conditions = [
        EmergencyPOI.latitude >= lat - delta_lat,
        EmergencyPOI.latitude <= lat + delta_lat,
        EmergencyPOI.longitude >= lng - delta_lon,
        EmergencyPOI.longitude <= lng + delta_lon,
    ]
    if type:
        conditions.append(EmergencyPOI.type == type.lower().strip())

    stmt = select(EmergencyPOI).where(and_(*conditions))
    res = await db.execute(stmt)
    candidates = res.scalars().all()

    nearby_results: List[NearbyEmergencyPOIItem] = []
    for poi in candidates:
        dist = haversine_km(lat, lng, poi.latitude, poi.longitude)
        if dist <= radiusKm:
            nearby_results.append(
                NearbyEmergencyPOIItem(
                    id=poi.id,
                    name=poi.name,
                    type=poi.type,
                    latitude=poi.latitude,
                    longitude=poi.longitude,
                    source=poi.source or "Overpass API (OSM)",
                    phone=poi.phone,
                    city=poi.city or "Delhi",
                    distanceKm=round(dist, 2)
                )
            )

    nearby_results.sort(key=lambda x: x.distanceKm)
    return nearby_results[:limit]
