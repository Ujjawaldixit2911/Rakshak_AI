from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import httpx
import time
import asyncio
from config import (
    THRESHOLD_LOW_MAX,
    THRESHOLD_MEDIUM_MAX,
    THRESHOLD_HIGH_MAX,
    HOTSPOT_CACHE_TTL_SECONDS,
    CRIME_API_BASE
)

app = FastAPI(title="Rakshak AI - Standalone Crime Hotspot Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RiskLevelType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def classify_risk_level(crime_count: int) -> RiskLevelType:
    if crime_count <= THRESHOLD_LOW_MAX:
        return "LOW"
    elif crime_count <= THRESHOLD_MEDIUM_MAX:
        return "MEDIUM"
    elif crime_count <= THRESHOLD_HIGH_MAX:
        return "HIGH"
    return "CRITICAL"

class HotspotAnalyzeRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radiusKm: Optional[float] = 1.0

class HotspotAnalyzeResponse(BaseModel):
    riskLevel: RiskLevelType
    crimeCount: int
    latitude: float
    longitude: float

class HotspotItem(BaseModel):
    latitude: float
    longitude: float
    riskLevel: RiskLevelType
    crimeCount: int

class HotspotCache:
    def __init__(self, ttl: int = HOTSPOT_CACHE_TTL_SECONDS):
        self.ttl = ttl
        self._cached: Optional[List[Dict[str, Any]]] = None
        self._timestamp: float = 0.0
        self._lock = asyncio.Lock()

    async def get(self) -> Optional[List[Dict[str, Any]]]:
        async with self._lock:
            if self._cached is not None and (time.time() - self._timestamp < self.ttl):
                return self._cached
        return None

    async def set(self, data: List[Dict[str, Any]]) -> None:
        async with self._lock:
            self._cached = data
            self._timestamp = time.time()

    async def clear(self) -> None:
        async with self._lock:
            self._cached = None
            self._timestamp = 0.0

cache = HotspotCache()

async def fetch_nearby_crimes(client: httpx.AsyncClient, lat: float, lng: float, radius_km: float):
    url = f"{CRIME_API_BASE}/api/crimes/nearby"
    try:
        res = await client.get(url, params={"lat": lat, "lng": lng, "radiusKm": radius_km, "limit": 1000}, timeout=5.0)
        if res.status_code == 200:
            return res.json()
        return []
    except Exception:
        return []

@app.post("/api/hotspots/analyze", response_model=HotspotAnalyzeResponse)
async def analyze_hotspot(payload: HotspotAnalyzeRequest):
    radius = payload.radiusKm or 1.0
    async with httpx.AsyncClient() as client:
        crimes = await fetch_nearby_crimes(client, payload.latitude, payload.longitude, radius)
    count = len(crimes)
    risk = classify_risk_level(count)
    return HotspotAnalyzeResponse(riskLevel=risk, crimeCount=count, latitude=payload.latitude, longitude=payload.longitude)

@app.get("/api/hotspots", response_model=List[HotspotItem])
async def get_precomputed_hotspots():
    cached_data = await cache.get()
    if cached_data is not None:
        return [HotspotItem(**item) for item in cached_data]

    anchors = [
        (28.6304, 77.2177), (28.6506, 77.2303), (28.6289, 77.2065),
        (28.5700, 77.2200), (28.6200, 77.3600), (28.5708, 77.3260),
        (28.6692, 77.4538), (28.4595, 77.0266), (28.6850, 77.1200)
    ]
    computed = []
    async with httpx.AsyncClient() as client:
        for lat, lon in anchors:
            crimes = await fetch_nearby_crimes(client, lat, lon, radius_km=1.5)
            count = len(crimes)
            risk = classify_risk_level(count)
            computed.append({"latitude": lat, "longitude": lon, "riskLevel": risk, "crimeCount": count})

    await cache.set(computed)
    return [HotspotItem(**item) for item in computed]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
