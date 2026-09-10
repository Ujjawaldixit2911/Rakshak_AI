from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import httpx
import os
import time
import hashlib
import asyncio
from segmenter import split_route_geometry

app = FastAPI(title="Rakshak AI - Standalone Route Risk Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HOTSPOT_API_BASE = os.getenv("HOTSPOT_API_BASE", "http://127.0.0.1:8000").rstrip("/")
CACHE_TTL = int(os.getenv("ROUTE_RISK_CACHE_TTL", "600"))

class RouteRiskCache:
    def __init__(self, ttl: int = CACHE_TTL):
        self.ttl = ttl
        self._cache: Dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key in self._cache:
                ts, val = self._cache[key]
                if time.time() - ts < self.ttl:
                    return val
                del self._cache[key]
        return None

    async def set(self, key: str, val: Any) -> None:
        async with self._lock:
            self._cache[key] = (time.time(), val)

cache = RouteRiskCache()

RiskLevelType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

class RouteSegmentRisk(BaseModel):
    segmentIndex: int
    riskLevel: RiskLevelType
    crimeCount: int
    startPoint: List[float]
    endPoint: List[float]
    midPoint: List[float]

class AnalyzeRouteRiskRequest(BaseModel):
    geometry: List[List[float]] = Field(..., min_length=2)
    segmentLengthKm: Optional[float] = 0.8

class AnalyzeRouteRiskResponse(BaseModel):
    segments: List[RouteSegmentRisk]
    highRiskSegmentCount: int
    totalSegments: int
    overallRisk: RiskLevelType

async def query_hotspot(client: httpx.AsyncClient, seg: Dict[str, Any], radius_km: float):
    mid = seg["midPoint"]
    try:
        res = await client.post(
            f"{HOTSPOT_API_BASE}/api/hotspots/analyze",
            json={"latitude": mid[1], "longitude": mid[0], "radiusKm": radius_km},
            timeout=5.0
        )
        if res.status_code == 200:
            d = res.json()
            return {**seg, "riskLevel": d.get("riskLevel", "LOW"), "crimeCount": d.get("crimeCount", 0)}
    except Exception:
        pass
    return {**seg, "riskLevel": "LOW", "crimeCount": 0}

@app.post("/api/risk/analyze-route", response_model=AnalyzeRouteRiskResponse)
async def analyze_route_risk(payload: AnalyzeRouteRiskRequest):
    if len(payload.geometry) < 2:
        raise HTTPException(status_code=400, detail="Geometry requires at least 2 points.")

    geom_hash = hashlib.md5(str(payload.geometry).encode()).hexdigest()
    cached = await cache.get(geom_hash)
    if cached:
        return AnalyzeRouteRiskResponse(**cached)

    step_km = payload.segmentLengthKm or 0.8
    segments = split_route_geometry(payload.geometry, target_segment_km=step_km)

    async with httpx.AsyncClient() as client:
        tasks = [query_hotspot(client, seg, radius_km=max(0.5, step_km / 2.0)) for seg in segments]
        analyzed = await asyncio.gather(*tasks)

    high_risk_count = sum(1 for s in analyzed if s["riskLevel"] in ("HIGH", "CRITICAL"))
    max_risk = "LOW"
    rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
    for s in analyzed:
        if rank.get(s["riskLevel"], 1) > rank.get(max_risk, 1):
            max_risk = s["riskLevel"]

    res_dict = {
        "segments": analyzed,
        "highRiskSegmentCount": high_risk_count,
        "totalSegments": len(analyzed),
        "overallRisk": max_risk
    }
    await cache.set(geom_hash, res_dict)
    return AnalyzeRouteRiskResponse(**res_dict)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
