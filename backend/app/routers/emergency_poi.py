"""
emergency_poi.py
Emergency POI Module (Module 15) for Rakshak AI.
Owns emergency Points of Interest (Police Stations, Hospitals, Fire Stations, Pharmacies).
Provides:
- GET /api/emergency/nearby (Spatial radius search, PostGIS / Haversine, sorted by distance asc)
- GET /api/emergency/pois (City-wide listing)
- POST /api/emergency/sync (Triggers Overpass API background sync / cache refresh)
"""
import math
import logging
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.database import get_db
from app.models import EmergencyPOI
from app.overpass_sync import sync_emergency_pois_for_city

logger = logging.getLogger("RakshakAI.EmergencyPOI")
router = APIRouter(prefix="/api/emergency", tags=["Emergency POI Module"])

POIType = Literal["police", "hospital", "fire_station", "pharmacy"]


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class EmergencyPOIItem(BaseModel):
    id: int = Field(..., description="Unique POI database identifier")
    name: str = Field(..., description="Name of the emergency facility")
    type: str = Field(..., description="police | hospital | fire_station | pharmacy")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    source: str = Field("Overpass API (OSM)", description="Data origin attribution")
    phone: Optional[str] = Field(None, description="Direct phone contact / emergency hotline")
    city: str = Field("Delhi", description="City region")


class NearbyEmergencyPOIItem(EmergencyPOIItem):
    distanceKm: float = Field(..., description="Distance in kilometers from target coordinate")


class SyncPOIRequest(BaseModel):
    city: str = Field("Delhi", description="City to synchronize (e.g. Delhi, Mumbai)")
    lat: Optional[float] = Field(None, description="Optional center latitude")
    lng: Optional[float] = Field(None, description="Optional center longitude")
    radiusKm: float = Field(15.0, gt=0.0, le=50.0, description="Bounding radius for Overpass sync")
    forceSeed: bool = Field(False, description="Force re-seeding with curated defaults")


class SyncPOIResponse(BaseModel):
    status: str
    synced: int
    city: str
    center: dict
    radiusKm: float
    breakdown: dict


# ─── Spatial Distance Helper ──────────────────────────────────────────────────
def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates spherical distance in km between two coordinate pairs."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 3)


# ─── REST Endpoints ───────────────────────────────────────────────────────────
@router.get(
    "/nearby",
    response_model=List[NearbyEmergencyPOIItem],
    summary="Find Nearby Emergency POIs",
    description="Returns police stations, hospitals, fire stations, and pharmacies within radiusKm, sorted by distance ascending."
)
async def get_nearby_emergency_pois(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Target latitude center point"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Target longitude center point"),
    radiusKm: float = Query(5.0, gt=0.0, le=50.0, description="Search radius in kilometers"),
    type: Optional[str] = Query(None, description="Optional filter: police, hospital, fire_station, pharmacy"),
    limit: int = Query(50, ge=1, le=500, description="Maximum POIs to return"),
    db: AsyncSession = Depends(get_db)
) -> List[NearbyEmergencyPOIItem]:
    # Ensure database has seed data if empty
    count_check = await db.execute(select(EmergencyPOI).limit(1))
    if not count_check.scalars().first():
        logger.info("Emergency POI table empty on first query. Initializing seed data...")
        await sync_emergency_pois_for_city(db, city="Delhi", force_seed=True)

    # Fast bounding-box prefilter (1 deg lat ~ 111 km)
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
        dist = calculate_haversine_distance_km(lat, lng, poi.latitude, poi.longitude)
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

    # Sort strictly by distance ascending
    nearby_results.sort(key=lambda x: x.distanceKm)
    return nearby_results[:limit]


@router.get(
    "/pois",
    response_model=List[EmergencyPOIItem],
    summary="List Emergency Points of Interest",
    description="Returns precomputed emergency POIs by city and type."
)
async def list_emergency_pois(
    city: Optional[str] = Query(None, description="Optional city filter (e.g. Delhi, Mumbai)"),
    type: Optional[str] = Query(None, description="Optional type filter (police, hospital, fire_station, pharmacy)"),
    limit: int = Query(100, ge=1, le=1000, description="Max POIs to return"),
    db: AsyncSession = Depends(get_db)
) -> List[EmergencyPOIItem]:
    # Ensure seed if empty
    count_check = await db.execute(select(EmergencyPOI).limit(1))
    if not count_check.scalars().first():
        await sync_emergency_pois_for_city(db, city="Delhi", force_seed=True)

    conditions = []
    if city:
        conditions.append(EmergencyPOI.city.ilike(f"%{city}%"))
    if type:
        conditions.append(EmergencyPOI.type == type.lower().strip())

    stmt = select(EmergencyPOI)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.limit(limit)

    res = await db.execute(stmt)
    records = res.scalars().all()

    return [
        EmergencyPOIItem(
            id=r.id,
            name=r.name,
            type=r.type,
            latitude=r.latitude,
            longitude=r.longitude,
            source=r.source or "Overpass API (OSM)",
            phone=r.phone,
            city=r.city or "Delhi"
        )
        for r in records
    ]


@router.post(
    "/sync",
    response_model=SyncPOIResponse,
    summary="Trigger Overpass API POI Re-Sync",
    description="Fetches latest POIs from OpenStreetMap Overpass API and updates database cache."
)
async def trigger_overpass_sync(
    payload: SyncPOIRequest,
    db: AsyncSession = Depends(get_db)
) -> SyncPOIResponse:
    sync_result = await sync_emergency_pois_for_city(
        db=db,
        city=payload.city,
        lat=payload.lat,
        lon=payload.lng,
        radius_km=payload.radiusKm,
        force_seed=payload.forceSeed
    )
    return SyncPOIResponse(**sync_result)
