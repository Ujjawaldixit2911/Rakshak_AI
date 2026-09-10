"""
hotspots.py
Independent Crime Hotspot Module for Rakshak AI.
Layered strictly on top of the Crime Data Module's REST API (GET /api/crimes/nearby).
- Zero direct database access to crime records or database tables.
- Configurable risk thresholds (LOW, MEDIUM, HIGH, CRITICAL) via env / config.
- Endpoints:
    POST /api/hotspots/analyze -> { riskLevel, crimeCount, latitude, longitude }
    GET  /api/hotspots        -> [ { latitude, longitude, riskLevel, crimeCount }, ... ] (6h TTL Cache)
"""

import os
import time
import asyncio
import logging
from typing import List, Optional, Literal, Dict, Any, Tuple
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("RakshakAI.Hotspots")

router = APIRouter(
    prefix="/api/hotspots",
    tags=["Crime Hotspot Module"]
)

# ─── Configurable Thresholds & Base URLs ──────────────────────────────────────────
# Default boundaries: 0-5 LOW, 6-15 MEDIUM, 16-30 HIGH, 30+ CRITICAL
THRESHOLD_LOW_MAX = int(os.getenv("HOTSPOT_THRESHOLD_LOW_MAX", "5"))
THRESHOLD_MEDIUM_MAX = int(os.getenv("HOTSPOT_THRESHOLD_MEDIUM_MAX", "15"))
THRESHOLD_HIGH_MAX = int(os.getenv("HOTSPOT_THRESHOLD_HIGH_MAX", "30"))

HOTSPOT_CACHE_TTL = int(os.getenv("HOTSPOT_CACHE_TTL_SECONDS", "21600"))  # 6 hours
CRIME_API_BASE = os.getenv("CRIME_API_BASE", "http://127.0.0.1:8000").rstrip("/")

RiskLevelType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def classify_risk_level(
    crime_count: int,
    low_max: int = THRESHOLD_LOW_MAX,
    medium_max: int = THRESHOLD_MEDIUM_MAX,
    high_max: int = THRESHOLD_HIGH_MAX
) -> RiskLevelType:
    """
    Maps total crimes in zone to a riskLevel using dynamic threshold boundaries.
    """
    if crime_count <= low_max:
        return "LOW"
    elif crime_count <= medium_max:
        return "MEDIUM"
    elif crime_count <= high_max:
        return "HIGH"
    else:
        return "CRITICAL"


# ─── In-Memory Cache for Precomputed Hotspots ────────────────────────────────────
class PrecomputedHotspotCache:
    def __init__(self, ttl: int = HOTSPOT_CACHE_TTL):
        self.ttl = ttl
        self._cached_hotspots: Optional[List[Dict[str, Any]]] = None
        self._timestamp: float = 0.0
        self._lock = asyncio.Lock()

    async def get(self) -> Optional[List[Dict[str, Any]]]:
        async with self._lock:
            if self._cached_hotspots is not None and (time.time() - self._timestamp < self.ttl):
                return self._cached_hotspots
        return None

    async def set(self, data: List[Dict[str, Any]]) -> None:
        async with self._lock:
            self._cached_hotspots = data
            self._timestamp = time.time()

    async def clear(self) -> None:
        async with self._lock:
            self._cached_hotspots = None
            self._timestamp = 0.0


hotspot_cache = PrecomputedHotspotCache(ttl=HOTSPOT_CACHE_TTL)


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
class HotspotAnalyzeRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Zone center latitude", json_schema_extra={"example": 28.62})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Zone center longitude", json_schema_extra={"example": 77.21})
    radiusKm: Optional[float] = Field(1.0, gt=0.0, le=50.0, description="Radius in km", json_schema_extra={"example": 1.0})


class HotspotAnalyzeResponse(BaseModel):
    riskLevel: RiskLevelType = Field(..., description="Risk category", json_schema_extra={"example": "HIGH"})
    crimeCount: int = Field(..., description="Total crimes detected in zone", json_schema_extra={"example": 27})
    latitude: float = Field(..., description="Center latitude", json_schema_extra={"example": 28.62})
    longitude: float = Field(..., description="Center longitude", json_schema_extra={"example": 77.21})


class HotspotItem(BaseModel):
    latitude: float = Field(..., description="Hotspot latitude", json_schema_extra={"example": 28.6304})
    longitude: float = Field(..., description="Hotspot longitude", json_schema_extra={"example": 77.2177})
    riskLevel: RiskLevelType = Field(..., description="Risk level", json_schema_extra={"example": "CRITICAL"})
    crimeCount: int = Field(..., description="Crime count in cluster", json_schema_extra={"example": 42})


# ─── Internal Helper to Fetch from Crime API ──────────────────────────────────────
async def fetch_nearby_crimes_from_api(
    client: httpx.AsyncClient,
    lat: float,
    lng: float,
    radius_km: float
) -> List[Dict[str, Any]]:
    """
    Calls Crime Data Module API: GET /api/crimes/nearby.
    No direct DB access.
    """
    url = f"{CRIME_API_BASE}/api/crimes/nearby"
    params = {
        "lat": lat,
        "lng": lng,
        "radiusKm": radius_km,
        "limit": 1000
    }
    try:
        res = await client.get(url, params=params, timeout=5.0)
        if res.status_code == 200:
            return res.json()
        logger.warning("Crime API returned status %s for nearby query", res.status_code)
        return []
    except Exception as e:
        logger.error("Failed to query Crime Data Module API: %s", e)
        return []


# Pre-defined city surveillance grid sample anchors (Delhi-NCR core hubs)
NCR_GRID_ANCHORS = [
    (28.6304, 77.2177),  # Connaught Place
    (28.6506, 77.2303),  # Chandni Chowk
    (28.6289, 77.2065),  # New Delhi Railway
    (28.5700, 77.2200),  # INA / South Extension
    (28.6200, 77.3600),  # Noida Sector 62
    (28.5708, 77.3260),  # Sector 18 Noida
    (28.6692, 77.4538),  # Ghaziabad Hub
    (28.4595, 77.0266),  # Cyber Hub Gurugram
    (28.6850, 77.1200),  # Rohini
    (28.5244, 77.1855),  # Hauz Khas
]


# ─── REST Endpoints ──────────────────────────────────────────────────────────────
@router.post(
    "/analyze",
    response_model=HotspotAnalyzeResponse,
    summary="Analyze Zone Hotspot Risk",
    description="Fetches nearby crimes via Crime Data Module API and computes zone riskLevel using configurable threshold boundaries."
)
async def analyze_hotspot(payload: HotspotAnalyzeRequest) -> HotspotAnalyzeResponse:
    radius = payload.radiusKm if payload.radiusKm is not None else 1.0

    async with httpx.AsyncClient() as client:
        crimes = await fetch_nearby_crimes_from_api(
            client,
            payload.latitude,
            payload.longitude,
            radius
        )

    crime_count = len(crimes)
    risk_level = classify_risk_level(crime_count)

    return HotspotAnalyzeResponse(
        riskLevel=risk_level,
        crimeCount=crime_count,
        latitude=payload.latitude,
        longitude=payload.longitude
    )


@router.get(
    "",
    response_model=List[HotspotItem],
    summary="Get Precomputed Hotspots Grid",
    description="Returns precomputed city-wide hotspots with a 6-hour TTL cache, queried strictly through the Crime Data Module API."
)
async def get_precomputed_hotspots() -> List[HotspotItem]:
    # Check 6h cache
    cached = await hotspot_cache.get()
    if cached is not None:
        return [HotspotItem(**item) for item in cached]

    # Recompute across grid anchors via Crime Data Module API
    computed_hotspots: List[Dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for lat, lon in NCR_GRID_ANCHORS:
            crimes = await fetch_nearby_crimes_from_api(client, lat, lon, radius_km=1.5)
            count = len(crimes)
            risk = classify_risk_level(count)
            computed_hotspots.append({
                "latitude": lat,
                "longitude": lon,
                "riskLevel": risk,
                "crimeCount": count
            })

    # Save to 6h TTL cache
    await hotspot_cache.set(computed_hotspots)
    return [HotspotItem(**item) for item in computed_hotspots]
