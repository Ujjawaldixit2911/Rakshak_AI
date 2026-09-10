from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import httpx
import os
import time
import asyncio
from config import WEIGHT_TIME, WEIGHT_SAFETY, ROUTE_COMPARE_CACHE_TTL_SECONDS, INTERNAL_API_BASE

app = FastAPI(title="Rakshak AI - Standalone Three-Route Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteCompareCache:
    def __init__(self, ttl: int = ROUTE_COMPARE_CACHE_TTL_SECONDS):
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

cache = RouteCompareCache()

class CoordinatePoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)

class RouteCompareRequest(BaseModel):
    source: CoordinatePoint
    destination: CoordinatePoint

class EvaluatedRouteOption(BaseModel):
    distance: float
    duration: float
    safetyScore: float
    highRiskSegments: int
    geometry: List[List[float]]
    label: str
    description: str

class RouteCompareResponse(BaseModel):
    fastest: EvaluatedRouteOption
    safest: EvaluatedRouteOption
    balanced: EvaluatedRouteOption
    evaluatedAlternativesCount: int

async def fetch_alts(client: httpx.AsyncClient, src: CoordinatePoint, dst: CoordinatePoint) -> List[Dict[str, Any]]:
    payload = {"source": {"lat": src.lat, "lng": src.lng}, "destination": {"lat": dst.lat, "lng": dst.lng}}
    try:
        res = await client.post(f"{INTERNAL_API_BASE}/api/route/alternatives", json=payload, timeout=8.0)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    try:
        res = await client.post(f"{INTERNAL_API_BASE}/api/route/calculate", json=payload, timeout=8.0)
        if res.status_code == 200:
            return [res.json()]
    except Exception:
        pass
    return []

async def analyze_risk(client: httpx.AsyncClient, geom: List[List[float]]) -> Dict[str, Any]:
    try:
        res = await client.post(f"{INTERNAL_API_BASE}/api/risk/analyze-route", json={"geometry": geom}, timeout=8.0)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return {"segments": [], "highRiskSegmentCount": 0}

def score_route(risk: Dict[str, Any]) -> float:
    high_risk = risk.get("highRiskSegmentCount", 0)
    segments = risk.get("segments", [])
    crimes = sum(s.get("crimeCount", 0) for s in segments)
    score = 98.0 - (high_risk * 15.0) - (crimes * 0.4)
    return round(max(20.0, min(98.0, score)), 1)

def calc_cost(duration: float, score: float, min_d: float, max_d: float) -> float:
    span = max(0.1, max_d - min_d)
    norm_dur = (duration - min_d) / span
    norm_risk = (100.0 - score) / 100.0
    return (norm_dur * WEIGHT_TIME) + (norm_risk * WEIGHT_SAFETY)

@app.post("/api/routes/compare", response_model=RouteCompareResponse)
async def compare_routes(payload: RouteCompareRequest):
    src, dst = payload.source, payload.destination
    cache_key = f"cmp:{src.lat},{src.lng}->{dst.lat},{dst.lng}"
    cached = await cache.get(cache_key)
    if cached:
        return RouteCompareResponse(**cached)

    async with httpx.AsyncClient() as client:
        alts = await fetch_alts(client, src, dst)
        if not alts:
            raise HTTPException(status_code=404, detail="No route alternatives found.")
        risk_tasks = [analyze_risk(client, r["geometry"]) for r in alts]
        risk_res = await asyncio.gather(*risk_tasks)

    candidates = []
    for r, risk in zip(alts, risk_res):
        sc = score_route(risk)
        candidates.append({
            "distance": r["distance"],
            "duration": r["duration"],
            "safetyScore": sc,
            "highRiskSegments": risk.get("highRiskSegmentCount", 0),
            "geometry": r["geometry"]
        })

    durations = [c["duration"] for c in candidates]
    min_d, max_d = min(durations), max(durations)
    for c in candidates:
        c["cost"] = calc_cost(c["duration"], c["safetyScore"], min_d, max_d)

    fastest = min(candidates, key=lambda x: x["duration"])
    safest = max(candidates, key=lambda x: (x["safetyScore"], -x["highRiskSegments"], -x["duration"]))
    balanced = min(candidates, key=lambda x: x["cost"])

    result = {
        "fastest": {
            "distance": fastest["distance"],
            "duration": fastest["duration"],
            "safetyScore": fastest["safetyScore"],
            "highRiskSegments": fastest["highRiskSegments"],
            "geometry": fastest["geometry"],
            "label": "Fastest Route",
            "description": f"Shortest duration ({fastest['duration']} mins)."
        },
        "safest": {
            "distance": safest["distance"],
            "duration": safest["duration"],
            "safetyScore": safest["safetyScore"],
            "highRiskSegments": safest["highRiskSegments"],
            "geometry": safest["geometry"],
            "label": "Safest Route",
            "description": f"Maximum safety score ({safest['safetyScore']}/100)."
        },
        "balanced": {
            "distance": balanced["distance"],
            "duration": balanced["duration"],
            "safetyScore": balanced["safetyScore"],
            "highRiskSegments": balanced["highRiskSegments"],
            "geometry": balanced["geometry"],
            "label": "Balanced Route",
            "description": f"Optimized time vs safety trade-off ({balanced['safetyScore']} score, {balanced['duration']} mins)."
        },
        "evaluatedAlternativesCount": len(candidates)
    }

    await cache.set(cache_key, result)
    return RouteCompareResponse(**result)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
