"""
route.py
Independent Route Module for Rakshak AI.
Exposes route calculation via OSRM (Open Source Routing Machine) proxy:
- In-memory TTL caching (10 min / 600s)
- Unit conversion: meters -> km, seconds -> minutes
- Decoded GeoJSON geometry for direct Leaflet rendering
- ETA calculation
- Timeout (8s) & fallback error handling ({ "error": "route_not_found" })
- Zero direct dependencies on Location, Safety, Crime, or User modules.
"""

import os
import time
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple, List
import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("RakshakAI.Route")

router = APIRouter(
    prefix="/api/route",
    tags=["Route Module"]
)

# ─── Configuration & In-Memory TTL Cache ──────────────────────────────────────────
# OSRM public demo server or custom self-hosted instance (e.g., http://localhost:5000)
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
CACHE_TTL_SECONDS = 600  # 10 minutes TTL
REQUEST_TIMEOUT_SECONDS = 8.0  # 8s timeout


class InMemoryRouteCache:
    """
    Thread-safe in-memory cache for computed routes with TTL expiration.
    """
    def __init__(self, ttl: int = CACHE_TTL_SECONDS):
        self.ttl = ttl
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._cache:
                timestamp, data = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return data
                else:
                    del self._cache[key]
        return None

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            # Auto-prune if cache gets large
            if len(self._cache) > 2000:
                now = time.time()
                self._cache = {
                    k: v for k, v in self._cache.items()
                    if now - v[0] < self.ttl
                }
            self._cache[key] = (time.time(), value)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


route_cache = InMemoryRouteCache(ttl=CACHE_TTL_SECONDS)


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
class CoordinatePoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate", json_schema_extra={"example": 28.6692})
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate", json_schema_extra={"example": 77.4538})


class RouteCalculateRequest(BaseModel):
    source: CoordinatePoint
    destination: CoordinatePoint


class RouteCalculateResponse(BaseModel):
    distance: float = Field(..., description="Route distance in kilometers (km)", json_schema_extra={"example": 32.4})
    duration: float = Field(..., description="Estimated travel time in minutes", json_schema_extra={"example": 78.0})
    geometry: List[List[float]] = Field(..., description="GeoJSON coordinates array [[lng, lat], ...]", json_schema_extra={"example": [[77.4538, 28.6692], [77.2090, 28.6139]]})
    eta: Optional[str] = Field(None, description="ISO-8601 formatted ETA timestamp")
    eta_formatted: Optional[str] = Field(None, description="Human readable ETA time (e.g. 10:45 AM)")


# ─── Normalization Helper ────────────────────────────────────────────────────────
def make_cache_key(src_lat: float, src_lng: float, dst_lat: float, dst_lng: float) -> str:
    return f"{round(src_lat, 5)},{round(src_lng, 5)}->{round(dst_lat, 5)},{round(dst_lng, 5)}"


# ─── Route Calculation Endpoint ──────────────────────────────────────────────────
@router.post(
    "/calculate",
    response_model=RouteCalculateResponse,
    responses={
        404: {
            "description": "Route Not Found",
            "content": {"application/json": {"example": {"error": "route_not_found"}}}
        }
    },
    summary="Calculate Driving Route",
    description="Fetches driving route from OSRM, converts units (meters->km, sec->min), decodes GeoJSON geometry, and computes ETA."
)
async def calculate_route(payload: RouteCalculateRequest):
    src = payload.source
    dst = payload.destination

    cache_key = make_cache_key(src.lat, src.lng, dst.lat, dst.lng)
    cached_data = await route_cache.get(cache_key)
    if cached_data:
        logger.debug("Cache hit for route: %s", cache_key)
        # Re-compute ETA dynamically based on current time
        duration_minutes = cached_data["duration"]
        now = datetime.now(timezone.utc)
        eta_time = now + timedelta(minutes=duration_minutes)
        cached_data["eta"] = eta_time.isoformat()
        cached_data["eta_formatted"] = eta_time.strftime("%I:%M %p UTC")
        return RouteCalculateResponse(**cached_data)

    # OSRM expects coordinates formatted as: lng1,lat1;lng2,lat2
    osrm_url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{src.lng},{src.lat};{dst.lng},{dst.lat}"
        f"?overview=full&geometries=geojson"
    )

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(osrm_url)

        if response.status_code != 200:
            logger.warning("OSRM returned status %s for url: %s", response.status_code, osrm_url)
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"error": "route_not_found"}
            )

        data = response.json()
        if data.get("code") != "Ok" or not data.get("routes") or len(data["routes"]) == 0:
            logger.warning("OSRM returned no valid routes for source/dest: %s", data.get("code"))
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"error": "route_not_found"}
            )

        primary_route = data["routes"][0]
        raw_distance_meters = float(primary_route.get("distance", 0.0))
        raw_duration_seconds = float(primary_route.get("duration", 0.0))
        geometry = primary_route.get("geometry", {}).get("coordinates", [])

        if not geometry:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"error": "route_not_found"}
            )

        # Requirement 2: Unit conversion inside backend (meters -> km, seconds -> minutes)
        distance_km = round(raw_distance_meters / 1000.0, 2)
        duration_minutes = round(raw_duration_seconds / 60.0, 1)

        # Requirement 3: ETA calculation
        now = datetime.now(timezone.utc)
        eta_time = now + timedelta(minutes=duration_minutes)
        eta_iso = eta_time.isoformat()
        eta_formatted = eta_time.strftime("%I:%M %p UTC")

        result = {
            "distance": distance_km,
            "duration": duration_minutes,
            "geometry": geometry,
            "eta": eta_iso,
            "eta_formatted": eta_formatted
        }

        # Cache valid response (Requirement 5)
        await route_cache.set(cache_key, result)

        return RouteCalculateResponse(**result)

    except (httpx.TimeoutException, httpx.RequestError, Exception) as e:
        logger.error("Error or timeout communicating with OSRM: %s", e)
        # Requirement 4: Clean error shape on failure
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "route_not_found"}
        )


@router.post(
    "/alternatives",
    response_model=List[RouteCalculateResponse],
    summary="Fetch Multiple Alternative Driving Routes",
    description="Queries OSRM with alternatives=true to return up to 3 distinct driving routes for safety comparison."
)
async def calculate_route_alternatives(payload: RouteCalculateRequest) -> List[RouteCalculateResponse]:
    src = payload.source
    dst = payload.destination

    osrm_url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{src.lng},{src.lat};{dst.lng},{dst.lat}"
        f"?overview=full&geometries=geojson&alternatives=3"
    )

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(osrm_url)

        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="No routes found")

        data = response.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise HTTPException(status_code=404, detail="No routes found")

        results: List[RouteCalculateResponse] = []
        now = datetime.now(timezone.utc)

        for route_data in data["routes"]:
            raw_dist = float(route_data.get("distance", 0.0))
            raw_dur = float(route_data.get("duration", 0.0))
            geometry = route_data.get("geometry", {}).get("coordinates", [])

            if geometry:
                dist_km = round(raw_dist / 1000.0, 2)
                dur_min = round(raw_dur / 60.0, 1)
                eta_time = now + timedelta(minutes=dur_min)

                results.append(
                    RouteCalculateResponse(
                        distance=dist_km,
                        duration=dur_min,
                        geometry=geometry,
                        eta=eta_time.isoformat(),
                        eta_formatted=eta_time.strftime("%I:%M %p UTC")
                    )
                )

        if not results:
            raise HTTPException(status_code=404, detail="No valid geometries found")

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error("OSRM alternatives error: %s", e)
        raise HTTPException(status_code=502, detail="Upstream routing service failed")
