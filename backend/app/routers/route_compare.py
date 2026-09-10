"""
route_compare.py
Three-Route Comparison Engine for Rakshak AI.
Orchestration layer combining:
1. Route Module (queries OSRM alternatives)
2. Risk Module (segments geometry and evaluates segment risk)
3. Safety Scoring & Cost-Function Optimizer (Fastest / Safest / Balanced)
4. Personalization Layer (fetches/forwards user safety profile weights)

Features:
- Pure composition layer: Zero direct DB access.
- Parallelized risk & scoring evaluation via asyncio.gather.
- Dynamic profile weights forwarding (Women Safety Mode, Night Safety Mode).
- Explainable factor breakdown attached to each route option.
- Configurable cost-function weights (w_time, w_safety).
- Graceful degradation when fewer than 3 alternatives exist.
- In-memory caching with a 5-minute TTL.
"""

import os
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.routers.safety_score import SafetyScoreWeights, FactorBreakdownItem

logger = logging.getLogger("RakshakAI.RouteCompare")

router = APIRouter(
    prefix="/api/routes",
    tags=["Three-Route Engine"]
)

# ─── Configuration & Cost-Function Weights ────────────────────────────────────────
WEIGHT_TIME = float(os.getenv("ROUTE_WEIGHT_TIME", "0.5"))
WEIGHT_SAFETY = float(os.getenv("ROUTE_WEIGHT_SAFETY", "0.5"))
ROUTE_COMPARE_CACHE_TTL = int(os.getenv("ROUTE_COMPARE_CACHE_TTL_SECONDS", "300"))  # 5 min TTL
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


class InMemoryRouteCompareCache:
    def __init__(self, ttl: int = ROUTE_COMPARE_CACHE_TTL):
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
            if len(self._cache) > 1000:
                now = time.time()
                self._cache = {k: v for k, v in self._cache.items() if now - v[0] < self.ttl}
            self._cache[key] = (time.time(), val)

    async def clear(self) -> None:
        async with self._lock:
            self._cache.clear()


compare_cache = InMemoryRouteCompareCache(ttl=ROUTE_COMPARE_CACHE_TTL)


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
class CoordinatePoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 28.6692})
    lng: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": 77.4538})


class RouteCompareRequest(BaseModel):
    source: CoordinatePoint
    destination: CoordinatePoint
    atTime: Optional[str] = Field(
        None,
        description="Optional ISO-8601 timestamp to factor in time-of-day risk",
        json_schema_extra={"example": "2026-09-11T23:00:00+05:30"}
    )
    userId: Optional[str] = Field(
        None,
        description="Optional user ID to fetch & forward personalized safety profile weights",
        json_schema_extra={"example": "user_101"}
    )
    weights: Optional[SafetyScoreWeights] = Field(
        None,
        description="Optional explicit weight overrides"
    )


class EvaluatedRouteOption(BaseModel):
    distance: float = Field(..., description="Distance in km", json_schema_extra={"example": 32.4})
    duration: float = Field(..., description="Travel time in minutes", json_schema_extra={"example": 65.0})
    safetyScore: float = Field(..., description="Safety score (0-100)", json_schema_extra={"example": 86.0})
    highRiskSegments: int = Field(0, description="Count of high or critical risk segments")
    geometry: List[List[float]] = Field(..., description="Decoded GeoJSON polyline coordinates")
    label: str = Field(..., description="Option title (e.g. Fastest, Safest, Balanced)")
    description: str = Field(..., description="Reasoning and tradeoff description")
    breakdown: List[FactorBreakdownItem] = Field(default=[], description="Explainable +/- factor breakdown")


class RouteCompareResponse(BaseModel):
    fastest: EvaluatedRouteOption
    safest: EvaluatedRouteOption
    balanced: EvaluatedRouteOption
    evaluatedAlternativesCount: int = Field(..., description="Number of distinct alternatives evaluated")
    appliedWeights: Optional[Dict[str, float]] = Field(None, description="Personalized scoring weights applied")


# ─── Downstream API Fetchers ─────────────────────────────────────────────────────
async def fetch_user_profile_weights(
    client: httpx.AsyncClient,
    user_id: str,
    at_time_iso: Optional[str] = None
) -> SafetyScoreWeights:
    """Calls Profile Module API to resolve dynamic user safety profile weights."""
    url = f"{INTERNAL_API_BASE}/api/profile/safety-settings"
    params = {"userId": user_id}
    if at_time_iso:
        params["atTime"] = at_time_iso

    try:
        res = await client.get(url, params=params, timeout=5.0)
        if res.status_code == 200:
            data = res.json()
            w_dict = data.get("resolvedWeights", {})
            return SafetyScoreWeights(**w_dict)
    except Exception as e:
        logger.warning("Failed to fetch profile settings for %s: %s", user_id, e)

    # Fallback to default weights
    from app.routers.profile import compute_profile_weights
    return compute_profile_weights(at_time_iso=at_time_iso)


async def fetch_route_alternatives(
    client: httpx.AsyncClient,
    source: CoordinatePoint,
    destination: CoordinatePoint
) -> List[Dict[str, Any]]:
    """Calls Route Module API to fetch route alternatives."""
    url = f"{INTERNAL_API_BASE}/api/route/alternatives"
    payload = {
        "source": {"lat": source.lat, "lng": source.lng},
        "destination": {"lat": destination.lat, "lng": destination.lng}
    }
    try:
        res = await client.post(url, json=payload, timeout=8.0)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        logger.warning("Failed to call /api/route/alternatives, falling back to /api/route/calculate: %s", e)

    # Fallback to single route calculation
    try:
        calc_res = await client.post(
            f"{INTERNAL_API_BASE}/api/route/calculate",
            json=payload,
            timeout=8.0
        )
        if calc_res.status_code == 200:
            return [calc_res.json()]
    except Exception as e:
        logger.error("Failed to query Route Module: %s", e)

    return []


async def analyze_route_risk_api(
    client: httpx.AsyncClient,
    geometry: List[List[float]]
) -> Dict[str, Any]:
    """Calls Risk Module API to evaluate polyline segments."""
    url = f"{INTERNAL_API_BASE}/api/risk/analyze-route"
    try:
        res = await client.post(url, json={"geometry": geometry}, timeout=8.0)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        logger.warning("Failed to call /api/risk/analyze-route: %s", e)

    return {
        "segments": [],
        "highRiskSegmentCount": 0,
        "totalSegments": 1,
        "overallRisk": "LOW"
    }


def compute_safety_score_with_breakdown(
    risk_data: Dict[str, Any],
    at_time_iso: Optional[str] = None,
    weights: Optional[SafetyScoreWeights] = None
) -> tuple[float, List[FactorBreakdownItem]]:
    """
    Computes a composite 0-100 safety score and explainable factor breakdown
    incorporating personalized profile weights and time-of-day multipliers.
    """
    w = weights or SafetyScoreWeights()
    crime_w = w.crimeWeight or 1.0
    night_w = w.nightRiskWeight or 1.0
    women_mult = w.womenSafetyMultiplier or 1.0
    poi_w = w.emergencyPOIWeight or 1.0

    breakdown: List[FactorBreakdownItem] = []

    high_risk_count = risk_data.get("highRiskSegmentCount", 0)
    segments = risk_data.get("segments", [])

    total_crimes = sum(s.get("crimeCount", 0) for s in segments)
    critical_count = sum(1 for s in segments if s.get("riskLevel") == "CRITICAL")

    high_penalty = ((high_risk_count * 15.0) + (critical_count * 25.0)) * crime_w * women_mult
    crime_penalty = (total_crimes * 0.4) * crime_w
    base_val = 98.0
    base_score = max(20.0, min(98.0, base_val - high_penalty - crime_penalty))

    if high_risk_count > 0 or critical_count > 0:
        breakdown.append(FactorBreakdownItem(
            factor=f"{high_risk_count + critical_count} high-risk corridor segments",
            impact=-round(high_penalty, 1)
        ))
    if total_crimes > 0:
        breakdown.append(FactorBreakdownItem(
            factor=f"Historical crime density ({total_crimes} events)",
            impact=-round(crime_penalty, 1)
        ))
    else:
        breakdown.append(FactorBreakdownItem(
            factor="Zero crime hotspots along corridor",
            impact=10.0
        ))

    # Time-of-day Multiplier
    from .safety_score import get_time_multiplier
    mult, adjustment, bucket_label = get_time_multiplier(at_time_iso)

    if night_w > 1.0 and mult < 1.0:
        mult = max(0.40, mult - (night_w - 1.0) * 0.15)

    time_impact = round((base_score * mult) - base_score, 1)
    if time_impact < 0:
        breakdown.append(FactorBreakdownItem(
            factor=f"Night travel risk ({bucket_label})",
            impact=time_impact
        ))
    elif time_impact > 0:
        breakdown.append(FactorBreakdownItem(
            factor="Optimal daylight illumination",
            impact=time_impact
        ))

    if women_mult > 1.0:
        breakdown.append(FactorBreakdownItem(
            factor="Women Safety Mode active weighting",
            impact=-4.0
        ))

    poi_boost = round(6.0 * poi_w, 1)
    breakdown.append(FactorBreakdownItem(
        factor="Nearby emergency POI coverage",
        impact=poi_boost
    ))

    final_score = round(max(5.0, min(100.0, base_score * mult)), 1)
    return final_score, breakdown


def compute_safety_score(
    risk_data: Dict[str, Any],
    at_time_iso: Optional[str] = None,
    weights: Optional[SafetyScoreWeights] = None
) -> float:
    """Helper alias returning float score for backward compatibility."""
    score, _ = compute_safety_score_with_breakdown(risk_data, at_time_iso=at_time_iso, weights=weights)
    return score


def evaluate_cost(
    duration: float,
    safety_score: float,
    min_dur: float,
    max_dur: float,
    w_time: float = WEIGHT_TIME,
    w_safety: float = WEIGHT_SAFETY
) -> float:
    """
    Cost function formula:
    cost = normalize(duration) * w_time + ((100 - safetyScore)/100) * w_safety
    """
    dur_span = max(0.1, max_dur - min_dur)
    norm_duration = (duration - min_dur) / dur_span if dur_span > 0 else 0.0
    norm_safety_risk = (100.0 - safety_score) / 100.0

    return (norm_duration * w_time) + (norm_safety_risk * w_safety)


# ─── REST Endpoint ───────────────────────────────────────────────────────────────
@router.post(
    "/compare",
    response_model=RouteCompareResponse,
    summary="Compare Fastest, Safest, and Balanced Routes",
    description="Orchestrates Route Module alternatives, Risk Module segmentation, and Safety Score calculations with personalized weights to return 3 distinct route choices."
)
async def compare_routes(payload: RouteCompareRequest) -> RouteCompareResponse:
    src = payload.source
    dst = payload.destination
    cache_key = f"cmp:{round(src.lat,5)},{round(src.lng,5)}->{round(dst.lat,5)},{round(dst.lng,5)}@{payload.atTime or 'base'}@u={payload.userId or 'none'}@w={bool(payload.weights)}"

    cached = await compare_cache.get(cache_key)
    if cached:
        logger.debug("Cache hit for 3-route compare: %s", cache_key)
        return RouteCompareResponse(**cached)

    async with httpx.AsyncClient() as client:
        # Step 1: Resolve personalized weights if userId or weights supplied
        active_weights = payload.weights
        if not active_weights and payload.userId:
            active_weights = await fetch_user_profile_weights(client, payload.userId, payload.atTime)

        # Step 2: Fetch candidate route alternatives from Route Module
        alternatives = await fetch_route_alternatives(client, src, dst)

        if not alternatives:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No drivable route alternatives found between specified coordinates."
            )

        # Step 3: Concurrently analyze risk for all alternatives in parallel (asyncio.gather)
        risk_tasks = [
            analyze_route_risk_api(client, route["geometry"])
            for route in alternatives
        ]
        risk_results = await asyncio.gather(*risk_tasks)

    # Step 4: Compute scores and factor breakdown for each alternative
    evaluated_candidates = []
    for route, risk_info in zip(alternatives, risk_results):
        score, breakdown = compute_safety_score_with_breakdown(
            risk_info,
            at_time_iso=payload.atTime,
            weights=active_weights
        )
        evaluated_candidates.append({
            "distance": route["distance"],
            "duration": route["duration"],
            "safetyScore": score,
            "highRiskSegments": risk_info.get("highRiskSegmentCount", 0),
            "geometry": route["geometry"],
            "breakdown": breakdown
        })

    durations = [c["duration"] for c in evaluated_candidates]
    min_dur = min(durations)
    max_dur = max(durations)

    for c in evaluated_candidates:
        c["cost"] = evaluate_cost(c["duration"], c["safetyScore"], min_dur, max_dur)

    # Step 5: Classify into Fastest, Safest, and Balanced
    # Fastest = lowest duration
    fastest_cand = min(evaluated_candidates, key=lambda x: x["duration"])

    # Safest = highest safetyScore (and fewest highRiskSegments)
    safest_cand = max(evaluated_candidates, key=lambda x: (x["safetyScore"], -x["highRiskSegments"], -x["duration"]))

    # Balanced = lowest cost function
    balanced_cand = min(evaluated_candidates, key=lambda x: x["cost"])

    response_data = {
        "fastest": {
            "distance": fastest_cand["distance"],
            "duration": fastest_cand["duration"],
            "safetyScore": fastest_cand["safetyScore"],
            "highRiskSegments": fastest_cand["highRiskSegments"],
            "geometry": fastest_cand["geometry"],
            "label": "Fastest Route",
            "description": f"Shortest travel duration ({fastest_cand['duration']} mins), direct path.",
            "breakdown": fastest_cand["breakdown"]
        },
        "safest": {
            "distance": safest_cand["distance"],
            "duration": safest_cand["duration"],
            "safetyScore": safest_cand["safetyScore"],
            "highRiskSegments": safest_cand["highRiskSegments"],
            "geometry": safest_cand["geometry"],
            "label": "Safest Route",
            "description": f"Maximized safety score ({safest_cand['safetyScore']}/100) prioritizing safe zones.",
            "breakdown": safest_cand["breakdown"]
        },
        "balanced": {
            "distance": balanced_cand["distance"],
            "duration": balanced_cand["duration"],
            "safetyScore": balanced_cand["safetyScore"],
            "highRiskSegments": balanced_cand["highRiskSegments"],
            "geometry": balanced_cand["geometry"],
            "label": "Balanced Route",
            "description": f"Optimized multi-objective trade-off ({balanced_cand['safetyScore']} score, {balanced_cand['duration']} mins).",
            "breakdown": balanced_cand["breakdown"]
        },
        "evaluatedAlternativesCount": len(evaluated_candidates),
        "appliedWeights": active_weights.model_dump() if active_weights else None
    }

    # Cache for 5 minutes
    await compare_cache.set(cache_key, response_data)

    return RouteCompareResponse(**response_data)
