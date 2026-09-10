from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
import httpx
import os
import time
import asyncio
from datetime import datetime, timedelta, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StandaloneRouteModule")

app = FastAPI(
    title="Rakshak AI - Standalone Route Module",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "600"))
REQUEST_TIMEOUT_SECONDS = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "8.0"))

class InMemoryRouteCache:
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
                self._cache = {
                    k: v for k, v in self._cache.items()
                    if now - v[0] < self.ttl
                }
            self._cache[key] = (time.time(), value)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()

route_cache = InMemoryRouteCache(ttl=CACHE_TTL_SECONDS)

class CoordinatePoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)

class RouteCalculateRequest(BaseModel):
    source: CoordinatePoint
    destination: CoordinatePoint

class RouteCalculateResponse(BaseModel):
    distance: float
    duration: float
    geometry: List[List[float]]
    eta: Optional[str] = None
    eta_formatted: Optional[str] = None

def make_cache_key(src_lat: float, src_lng: float, dst_lat: float, dst_lng: float) -> str:
    return f"{round(src_lat, 5)},{round(src_lng, 5)}->{round(dst_lat, 5)},{round(dst_lng, 5)}"

@app.post("/api/route/calculate", response_model=RouteCalculateResponse)
async def calculate_route(payload: RouteCalculateRequest):
    src = payload.source
    dst = payload.destination
    cache_key = make_cache_key(src.lat, src.lng, dst.lat, dst.lng)

    cached = await route_cache.get(cache_key)
    if cached:
        now = datetime.now(timezone.utc)
        eta_time = now + timedelta(minutes=cached["duration"])
        cached["eta"] = eta_time.isoformat()
        cached["eta_formatted"] = eta_time.strftime("%I:%M %p UTC")
        return RouteCalculateResponse(**cached)

    osrm_url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{src.lng},{src.lat};{dst.lng},{dst.lat}"
        f"?overview=full&geometries=geojson"
    )

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(osrm_url)

        if response.status_code != 200:
            return JSONResponse(status_code=404, content={"error": "route_not_found"})

        data = response.json()
        if data.get("code") != "Ok" or not data.get("routes") or len(data["routes"]) == 0:
            return JSONResponse(status_code=404, content={"error": "route_not_found"})

        route_info = data["routes"][0]
        raw_dist = float(route_info.get("distance", 0.0))
        raw_dur = float(route_info.get("duration", 0.0))
        geometry = route_info.get("geometry", {}).get("coordinates", [])

        if not geometry:
            return JSONResponse(status_code=404, content={"error": "route_not_found"})

        dist_km = round(raw_dist / 1000.0, 2)
        dur_min = round(raw_dur / 60.0, 1)

        now = datetime.now(timezone.utc)
        eta_time = now + timedelta(minutes=dur_min)

        result = {
            "distance": dist_km,
            "duration": dur_min,
            "geometry": geometry,
            "eta": eta_time.isoformat(),
            "eta_formatted": eta_time.strftime("%I:%M %p UTC")
        }

        await route_cache.set(cache_key, result)
        return RouteCalculateResponse(**result)

    except Exception:
        return JSONResponse(status_code=404, content={"error": "route_not_found"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
