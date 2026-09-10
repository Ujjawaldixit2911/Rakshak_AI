"""
location.py
Independent Location Module for Rakshak AI.
Exposes forward and reverse geocoding via Nominatim with:
- In-memory TTL caching (1 day / 86400s)
- Rate-limiting (max 1 request/sec upstream as per OpenStreetMap Nominatim policy)
- Custom User-Agent and Referer headers
- Zero direct imports from Route, Safety, Crime, or User modules.
"""

import time
import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("RakshakAI.Location")

router = APIRouter(
    prefix="/api/location",
    tags=["Location Module"]
)

# ─── Configuration & In-Memory TTL Cache ──────────────────────────────────────────
NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "RakshakAI-LocationModule/1.0 (safety-navigation-app; contact: support@rakshak-ai.org)"
REFERER = "https://rakshak-ai.org"
CACHE_TTL_SECONDS = 86400  # 1 day TTL
MIN_REQUEST_INTERVAL_SECONDS = 1.05  # Nominatim rate limit: max 1 req/sec


class InMemoryLocationCache:
    """
    Thread-safe & async-safe in-memory cache with Time-To-Live (TTL) expiration.
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
            # Prune expired entries if cache grows large
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


class NominatimRateLimiter:
    """
    Ensures strict adherence to Nominatim's 1 request/second usage policy.
    """
    def __init__(self, min_interval: float = MIN_REQUEST_INTERVAL_SECONDS):
        self.min_interval = min_interval
        self._last_call_timestamp = 0.0
        self._lock = asyncio.Lock()

    async def wait_turn(self):
        async with self._lock:
            now = time.time()
            elapsed = now - self._last_call_timestamp
            if elapsed < self.min_interval:
                await asyncio.sleep(self.min_interval - elapsed)
            self._last_call_timestamp = time.time()


# Singleton instances for caching and rate-limiting
location_cache = InMemoryLocationCache(ttl=CACHE_TTL_SECONDS)
rate_limiter = NominatimRateLimiter(min_interval=MIN_REQUEST_INTERVAL_SECONDS)


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Address or place name to geocode", json_schema_extra={"example": "Ghaziabad"})


class GeocodeResponse(BaseModel):
    address: str = Field(..., description="Resolved location address name", json_schema_extra={"example": "Ghaziabad, Uttar Pradesh"})
    latitude: float = Field(..., description="Geographical latitude", json_schema_extra={"example": 28.6692})
    longitude: float = Field(..., description="Geographical longitude", json_schema_extra={"example": 77.4538})


class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90", json_schema_extra={"example": 28.6692})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180", json_schema_extra={"example": 77.4538})


class ReverseGeocodeResponse(BaseModel):
    address: str = Field(..., description="Resolved human-readable address", json_schema_extra={"example": "Ghaziabad, Uttar Pradesh"})


# ─── Helper Normalizers ──────────────────────────────────────────────────────────
def normalize_query(query: str) -> str:
    return " ".join(query.strip().lower().split())


def normalize_coords(lat: float, lon: float) -> str:
    return f"{round(lat, 5)},{round(lon, 5)}"


# ─── REST Endpoints ──────────────────────────────────────────────────────────────
@router.post(
    "/geocode",
    response_model=GeocodeResponse,
    summary="Forward Geocode Address",
    description="Converts an address or place name to latitude and longitude coordinates with caching and upstream rate-limiting."
)
async def geocode_location(payload: GeocodeRequest) -> GeocodeResponse:
    query = payload.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )

    cache_key = f"geo:{normalize_query(query)}"
    cached_result = await location_cache.get(cache_key)
    if cached_result:
        logger.debug("Cache hit for forward geocoding: %s", query)
        return GeocodeResponse(**cached_result)

    # Respect Nominatim Rate Limit
    await rate_limiter.wait_turn()

    headers = {
        "User-Agent": USER_AGENT,
        "Referer": REFERER,
        "Accept": "application/json",
    }
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{NOMINATIM_BASE_URL}/search",
                params=params,
                headers=headers
            )

        if response.status_code == 429:
            logger.warning("Nominatim rate limit reached (HTTP 429).")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Upstream geocoding service rate limit exceeded. Please retry in a moment."
            )

        response.raise_for_status()
        data = response.json()

        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No location found for query: '{query}'"
            )

        top_match = data[0]
        lat = float(top_match["lat"])
        lon = float(top_match["lon"])
        display_name = top_match.get("display_name", query)

        result_dict = {
            "address": display_name,
            "latitude": lat,
            "longitude": lon
        }

        # Cache valid response
        await location_cache.set(cache_key, result_dict)
        return GeocodeResponse(**result_dict)

    except httpx.TimeoutException:
        logger.error("Nominatim search request timed out for query: %s", query)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Geocoding service timed out. Please try again."
        )
    except httpx.HTTPStatusError as e:
        logger.error("Nominatim search HTTP error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream geocoding service returned status {e.response.status_code}."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during geocoding: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal geocoding error: {str(e)}"
        )


@router.post(
    "/reverse-geocode",
    response_model=ReverseGeocodeResponse,
    summary="Reverse Geocode Coordinates",
    description="Converts latitude and longitude coordinates into a human-readable street/city address with caching."
)
async def reverse_geocode_location(payload: ReverseGeocodeRequest) -> ReverseGeocodeResponse:
    lat = payload.latitude
    lon = payload.longitude

    cache_key = f"rev:{normalize_coords(lat, lon)}"
    cached_result = await location_cache.get(cache_key)
    if cached_result:
        logger.debug("Cache hit for reverse geocoding: %s, %s", lat, lon)
        return ReverseGeocodeResponse(**cached_result)

    # Respect Nominatim Rate Limit
    await rate_limiter.wait_turn()

    headers = {
        "User-Agent": USER_AGENT,
        "Referer": REFERER,
        "Accept": "application/json",
    }
    params = {
        "lat": lat,
        "lon": lon,
        "format": "json",
        "zoom": 18,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{NOMINATIM_BASE_URL}/reverse",
                params=params,
                headers=headers
            )

        if response.status_code == 429:
            logger.warning("Nominatim rate limit reached (HTTP 429).")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Upstream geocoding service rate limit exceeded. Please retry in a moment."
            )

        response.raise_for_status()
        data = response.json()

        if not data or "error" in data:
            error_msg = data.get("error", "Unable to reverse geocode coordinates.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No address found for coordinates ({lat}, {lon}): {error_msg}"
            )

        display_name = data.get("display_name")
        if not display_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No address name resolved for coordinates ({lat}, {lon})."
            )

        result_dict = {
            "address": display_name
        }

        # Cache valid response
        await location_cache.set(cache_key, result_dict)
        return ReverseGeocodeResponse(**result_dict)

    except httpx.TimeoutException:
        logger.error("Nominatim reverse request timed out for (%s, %s)", lat, lon)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Reverse geocoding service timed out. Please try again."
        )
    except httpx.HTTPStatusError as e:
        logger.error("Nominatim reverse HTTP error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream geocoding service returned status {e.response.status_code}."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during reverse geocoding: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal reverse geocoding error: {str(e)}"
        )
