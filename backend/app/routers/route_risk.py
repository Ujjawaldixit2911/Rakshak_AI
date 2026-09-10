"""
route_risk.py
Independent Route Risk Analysis Module for Rakshak AI.
Orchestration layer combining Route Module geometry and Hotspot Module risk analytics:
- Divides route geometry into ~500m - 1km segments
- Queries Hotspot Module API (/api/hotspots/analyze) concurrently via asyncio.gather
- Evaluates per-segment risk and highRiskSegmentCount
- In-memory route geometry hash caching (10 min TTL)
- Zero direct database access to Crime/User/Safety tables.
"""

import os
import time
import math
import hashlib
import asyncio
import logging
from typing import List, Dict, Any, Optional, Literal
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from shapely.geometry import LineString, Point

logger = logging.getLogger("RakshakAI.RouteRisk")

router = APIRouter(
    prefix="/api/risk",
    tags=["Route Risk Analysis Module"]
)

# ─── Configuration & In-Memory TTL Cache ──────────────────────────────────────────
HOTSPOT_API_BASE = os.getenv("HOTSPOT_API_BASE", "http://127.0.0.1:8000").rstrip("/")
CACHE_TTL_SECONDS = int(os.getenv("ROUTE_RISK_CACHE_TTL", "600"))  # 10 min TTL
DEFAULT_SEGMENT_KM = float(os.getenv("ROUTE_SEGMENT_KM", "0.8"))  # ~800m per segment


class InMemoryRouteRiskCache:
    def __init__(self, ttl: int = CACHE_TTL_SECONDS):
        self.ttl = ttl
        self._cache: Dict[str, tuple[float, Any]] = {}
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
            if len(self._cache) > 1000:
                now = time.time()
                self._cache = {
                    k: v for k, v in self._cache.items()
                    if now - v[0] < self.ttl
                }
            self._cache[key] = (time.time(), value)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


risk_cache = InMemoryRouteRiskCache(ttl=CACHE_TTL_SECONDS)


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
RiskLevelType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class RouteSegmentRisk(BaseModel):
    segmentIndex: int = Field(..., description="0-indexed segment sequence number")
    riskLevel: RiskLevelType = Field(..., description="Risk category: LOW, MEDIUM, HIGH, CRITICAL")
    crimeCount: int = Field(0, description="Crime incident count detected in segment vicinity")
    startPoint: List[float] = Field(..., description="[lng, lat] of segment start")
    endPoint: List[float] = Field(..., description="[lng, lat] of segment end")
    midPoint: List[float] = Field(..., description="[lng, lat] of segment midpoint used for analysis")


class AnalyzeRouteRiskRequest(BaseModel):
    geometry: List[List[float]] = Field(
        ...,
        min_length=2,
        description="Array of [lng, lat] coordinate pairs defining the route polyline",
        json_schema_extra={"example": [[77.4538, 28.6692], [77.3000, 28.6400], [77.2090, 28.6139]]}
    )
    segmentLengthKm: Optional[float] = Field(
        None,
        description="Optional override for segment chunk length in km (default ~0.8km)"
    )


class AnalyzeRouteRiskResponse(BaseModel):
    segments: List[RouteSegmentRisk] = Field(..., description="List of analyzed route segments with risk levels")
    highRiskSegmentCount: int = Field(..., description="Count of segments classified as HIGH or CRITICAL risk")
    totalSegments: int = Field(..., description="Total number of evaluated segments")
    overallRisk: RiskLevelType = Field(..., description="Overall aggregated route risk level")


# ─── Polyline Segmentation Algorithm ─────────────────────────────────────────────
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def segment_geometry_polyline(
    coords: List[List[float]],
    target_segment_km: float = DEFAULT_SEGMENT_KM
) -> List[Dict[str, Any]]:
    """
    Divides a [lng, lat] coordinate array into segments of approximately target_segment_km.
    Computes accurate startPoint, endPoint, and midPoint for each chunk.
    """
    if len(coords) < 2:
        return []

    # Calculate total cumulative distance
    cumulative_dists = [0.0]
    total_dist = 0.0
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        # p[0] is lng, p[1] is lat
        seg_d = haversine_km(p1[1], p1[0], p2[1], p2[0])
        total_dist += seg_d
        cumulative_dists.append(total_dist)

    if total_dist <= 0.001:
        # Route is basically a single point
        p_start = coords[0]
        p_end = coords[-1]
        return [{
            "segmentIndex": 0,
            "startPoint": p_start,
            "endPoint": p_end,
            "midPoint": p_start
        }]

    # Determine number of segments (at least 1)
    num_segments = max(1, int(math.ceil(total_dist / target_segment_km)))
    actual_step = total_dist / num_segments

    # Use Shapely LineString for exact interpolation along the line
    line = LineString([(pt[0], pt[1]) for pt in coords])
    line_geom_len = line.length

    segments = []
    for seg_idx in range(num_segments):
        start_d = seg_idx * actual_step
        end_d = min(total_dist, (seg_idx + 1) * actual_step)
        mid_d = (start_d + end_d) / 2.0

        # Normalized position on Shapely line (0.0 to 1.0)
        norm_start = start_d / total_dist if total_dist > 0 else 0.0
        norm_end = end_d / total_dist if total_dist > 0 else 1.0
        norm_mid = mid_d / total_dist if total_dist > 0 else 0.5

        start_pt = line.interpolate(norm_start * line_geom_len)
        end_pt = line.interpolate(norm_end * line_geom_len)
        mid_pt = line.interpolate(norm_mid * line_geom_len)

        segments.append({
            "segmentIndex": seg_idx,
            "startPoint": [round(start_pt.x, 6), round(start_pt.y, 6)],
            "endPoint": [round(end_pt.x, 6), round(end_pt.y, 6)],
            "midPoint": [round(mid_pt.x, 6), round(mid_pt.y, 6)],
        })

    return segments


def compute_geometry_hash(geometry: List[List[float]]) -> str:
    """Generates a stable MD5 hash of the coordinate sequence."""
    sample = ";".join(f"{round(pt[0], 5)},{round(pt[1], 5)}" for pt in geometry)
    return hashlib.md5(sample.encode("utf-8")).hexdigest()


# ─── Hotspot API Concurrent Orchestrator ──────────────────────────────────────────
async def query_segment_hotspot_risk(
    client: httpx.AsyncClient,
    segment: Dict[str, Any],
    radius_km: float = 0.8
) -> Dict[str, Any]:
    """
    Calls POST /api/hotspots/analyze on the Hotspot Module for a segment's midpoint.
    """
    mid = segment["midPoint"]
    payload = {
        "latitude": mid[1],   # lat
        "longitude": mid[0],  # lng
        "radiusKm": radius_km
    }

    try:
        res = await client.post(
            f"{HOTSPOT_API_BASE}/api/hotspots/analyze",
            json=payload,
            timeout=6.0
        )
        if res.status_code == 200:
            data = res.json()
            return {
                **segment,
                "riskLevel": data.get("riskLevel", "LOW"),
                "crimeCount": data.get("crimeCount", 0)
            }
    except Exception as e:
        logger.warning("Hotspot API call failed for segment midpoint (%s, %s): %s", mid[1], mid[0], e)

    # Fallback to LOW if call fails
    return {
        **segment,
        "riskLevel": "LOW",
        "crimeCount": 0
    }


# ─── REST Endpoints ──────────────────────────────────────────────────────────────
@router.post(
    "/analyze-route",
    response_model=AnalyzeRouteRiskResponse,
    summary="Analyze Route Segments for Hotspot Risk",
    description="Orchestrates route polyline segmentation and concurrent Hotspot API queries to attach risk levels and compute highRiskSegmentCount."
)
async def analyze_route_risk(payload: AnalyzeRouteRiskRequest) -> AnalyzeRouteRiskResponse:
    if len(payload.geometry) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geometry must contain at least 2 coordinate points [[lng, lat], ...]"
        )

    cache_key = f"risk:{compute_geometry_hash(payload.geometry)}"
    cached_result = await risk_cache.get(cache_key)
    if cached_result:
        logger.debug("Cache hit for route risk analysis: %s", cache_key)
        return AnalyzeRouteRiskResponse(**cached_result)

    target_seg_km = payload.segmentLengthKm or DEFAULT_SEGMENT_KM
    raw_segments = segment_geometry_polyline(payload.geometry, target_segment_km=target_seg_km)

    if not raw_segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to segment route geometry."
        )

    # Concurrently query Hotspot Module API for all segment midpoints in parallel
    async with httpx.AsyncClient() as client:
        tasks = [
            query_segment_hotspot_risk(client, seg, radius_km=max(0.5, target_seg_km / 2.0))
            for seg in raw_segments
        ]
        analyzed_segments = await asyncio.gather(*tasks)

    # Aggregate metrics
    high_risk_count = 0
    max_risk_level: RiskLevelType = "LOW"
    risk_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

    for seg in analyzed_segments:
        lvl = seg["riskLevel"]
        if lvl in ("HIGH", "CRITICAL"):
            high_risk_count += 1
        if risk_rank.get(lvl, 1) > risk_rank.get(max_risk_level, 1):
            max_risk_level = lvl

    response_dict = {
        "segments": analyzed_segments,
        "highRiskSegmentCount": high_risk_count,
        "totalSegments": len(analyzed_segments),
        "overallRisk": max_risk_level
    }

    # Store in 10-minute cache
    await risk_cache.set(cache_key, response_dict)

    return AnalyzeRouteRiskResponse(**response_dict)
