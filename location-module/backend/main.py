from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import time
import asyncio
from typing import Optional, Dict, Any, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StandaloneLocationModule")

app = FastAPI(title="Rakshak AI - Standalone Location Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
USER_AGENT = "RakshakAI-LocationModule/1.0 (safety-navigation; contact: support@rakshak-ai.org)"
REFERER = "https://rakshak-ai.org"
CACHE_TTL_SECONDS = 86400
MIN_REQUEST_INTERVAL_SECONDS = 1.05

class InMemoryLocationCache:
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
            if len(self._cache) > 2000:
                now = time.time()
                self._cache = {k: v for k, v in self._cache.items() if now - v[0] < self.ttl}
            self._cache[key] = (time.time(), value)

class NominatimRateLimiter:
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

location_cache = InMemoryLocationCache()
rate_limiter = NominatimRateLimiter()

class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=1)

class GeocodeResponse(BaseModel):
    address: str
    latitude: float
    longitude: float

class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

class ReverseGeocodeResponse(BaseModel):
    address: str

def normalize_query(query: str) -> str:
    return " ".join(query.strip().lower().split())

def normalize_coords(lat: float, lon: float) -> str:
    return f"{round(lat, 5)},{round(lon, 5)}"

@app.post("/api/location/geocode", response_model=GeocodeResponse)
async def geocode_location(payload: GeocodeRequest):
    q = payload.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    key = f"geo:{normalize_query(q)}"
    cached = await location_cache.get(key)
    if cached:
        return GeocodeResponse(**cached)

    await rate_limiter.wait_turn()

    headers = {"User-Agent": USER_AGENT, "Referer": REFERER, "Accept": "application/json"}
    params = {"q": q, "format": "json", "limit": 1, "addressdetails": 1}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{NOMINATIM_BASE_URL}/search", params=params, headers=headers)
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Upstream rate limit reached.")
        resp.raise_for_status()
        data = resp.json()
        if not data or not isinstance(data, list) or len(data) == 0:
            raise HTTPException(status_code=404, detail=f"No location found for query: '{q}'")

        res_dict = {
            "address": data[0].get("display_name", q),
            "latitude": float(data[0]["lat"]),
            "longitude": float(data[0]["lon"])
        }
        await location_cache.set(key, res_dict)
        return GeocodeResponse(**res_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/location/reverse-geocode", response_model=ReverseGeocodeResponse)
async def reverse_geocode(payload: ReverseGeocodeRequest):
    key = f"rev:{normalize_coords(payload.latitude, payload.longitude)}"
    cached = await location_cache.get(key)
    if cached:
        return ReverseGeocodeResponse(**cached)

    await rate_limiter.wait_turn()

    headers = {"User-Agent": USER_AGENT, "Referer": REFERER, "Accept": "application/json"}
    params = {"lat": payload.latitude, "lon": payload.longitude, "format": "json", "zoom": 18, "addressdetails": 1}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{NOMINATIM_BASE_URL}/reverse", params=params, headers=headers)
        if resp.status_code == 429:
            raise HTTPException(status_code=429, detail="Upstream rate limit reached.")
        resp.raise_for_status()
        data = resp.json()
        if not data or "error" in data:
            raise HTTPException(status_code=404, detail="No address found for coordinates.")

        res_dict = {"address": data.get("display_name", "Unknown Location")}
        await location_cache.set(key, res_dict)
        return ReverseGeocodeResponse(**res_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
