"""
safety_score.py
Independent Safety Score Calculation Engine for Rakshak AI with:
- Dynamic factor breakdown & explainability (+/- impacts for UI and LLM explanations)
- Time-of-day weighted factors (06:00-19:00: 1.0, 19:00-23:00: 0.85, 23:00-01:00: 0.65, 01:00-05:00: 0.55)
- Support for per-request personalized weight overrides (Women Safety Mode & Night Safety Mode)
- Zero direct database access.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/api/safety-score",
    tags=["Safety Score Module"]
)

# ─── Configurable Time Multipliers & Score Bands ──────────────────────────────────
SAFETY_SCORE_CONFIG = {
    "time_buckets": [
        {"name": "DEEP_NIGHT", "start_hour": 1, "end_hour": 5, "multiplier": 0.55, "label": "01:00-05:00 (deep night)"},
        {"name": "DAWN",       "start_hour": 5, "end_hour": 6, "multiplier": 0.90, "label": "05:00-06:00 (dawn transition)"},
        {"name": "DAYTIME",    "start_hour": 6, "end_hour": 19, "multiplier": 1.00, "label": "06:00-19:00 (baseline daytime)"},
        {"name": "EVENING",    "start_hour": 19, "end_hour": 23, "multiplier": 0.85, "label": "19:00-23:00 (evening)"},
        {"name": "LATE_NIGHT", "start_hour": 23, "end_hour": 1, "multiplier": 0.65, "label": "23:00-01:00 (late night)"},
    ],
    "weekend_multiplier": 0.95,
    "bands": {
        "High": 80.0,
        "Medium": 50.0,
        "Low": 0.0,
    }
}


def get_time_multiplier(at_time_iso: Optional[str]) -> Tuple[float, float, str]:
    if not at_time_iso:
        return 1.0, 0.0, "Baseline (daytime)"

    try:
        cleaned = at_time_iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO-8601 timestamp format for atTime. Example: '2026-09-11T23:00:00+05:30'"
        )

    hour = dt.hour + (dt.minute / 60.0)

    if 1.0 <= hour < 5.0:
        bucket = SAFETY_SCORE_CONFIG["time_buckets"][0]  # DEEP_NIGHT 0.55
    elif 5.0 <= hour < 6.0:
        bucket = SAFETY_SCORE_CONFIG["time_buckets"][1]  # DAWN 0.90
    elif 6.0 <= hour < 19.0:
        bucket = SAFETY_SCORE_CONFIG["time_buckets"][2]  # DAYTIME 1.00
    elif 19.0 <= hour < 23.0:
        bucket = SAFETY_SCORE_CONFIG["time_buckets"][3]  # EVENING 0.85
    else:
        bucket = SAFETY_SCORE_CONFIG["time_buckets"][4]  # LATE_NIGHT 0.65

    multiplier = bucket["multiplier"]
    time_adjustment = round(multiplier - 1.0, 2)
    return multiplier, time_adjustment, bucket["label"]


def classify_score_band(score: float) -> str:
    bands = SAFETY_SCORE_CONFIG["bands"]
    if score >= bands["High"]:
        return "High"
    elif score >= bands["Medium"]:
        return "Medium"
    else:
        return "Low"


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
class SegmentRiskItem(BaseModel):
    segmentIndex: Optional[int] = None
    riskLevel: Optional[str] = "LOW"
    crimeCount: Optional[int] = 0


class FactorBreakdownItem(BaseModel):
    factor: str = Field(..., description="Description of the safety/risk factor", json_schema_extra={"example": "Low crime density"})
    impact: float = Field(..., description="Positive or negative score impact", json_schema_extra={"example": 12.0})
    description: Optional[str] = None


class SafetyScoreWeights(BaseModel):
    crimeWeight: Optional[float] = Field(1.0, description="Crime frequency penalty multiplier")
    nightRiskWeight: Optional[float] = Field(1.0, description="Night travel risk multiplier")
    isolationWeight: Optional[float] = Field(1.0, description="Route isolation factor")
    emergencyPOIWeight: Optional[float] = Field(1.0, description="Emergency POI proximity boost multiplier")
    womenSafetyMultiplier: Optional[float] = Field(1.0, description="Women safety mode sensitivity multiplier")


class SafetyScoreCalculateRequest(BaseModel):
    segments: Optional[List[SegmentRiskItem]] = Field(None, description="Optional list of analyzed route segments")
    baseSafetyScore: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional explicit base score (0-100)")
    atTime: Optional[str] = Field(None, description="Optional ISO-8601 timestamp for time-of-day risk", json_schema_extra={"example": "2026-09-11T23:00:00+05:30"})
    weights: Optional[SafetyScoreWeights] = Field(None, description="Optional personalized weight overrides")


class SafetyScoreCalculateResponse(BaseModel):
    safetyScore: float = Field(..., description="Final personalized & time-adjusted safety score (0-100)", json_schema_extra={"example": 74.5})
    baseSafetyScore: float = Field(..., description="Unadjusted baseline score", json_schema_extra={"example": 88.0})
    band: str = Field(..., description="Risk band (High, Medium, Low)", json_schema_extra={"example": "High"})
    timeAdjustment: float = Field(..., description="Delta adjustment percentage from time", json_schema_extra={"example": -0.15})
    timeMultiplier: float = Field(..., description="Time multiplier applied", json_schema_extra={"example": 0.85})
    hourBucket: str = Field(..., description="Resolved time window description", json_schema_extra={"example": "19:00-23:00 (evening)"})
    breakdown: List[FactorBreakdownItem] = Field(default=[], description="Explainable +/- factor contributions")


# ─── REST Endpoint ───────────────────────────────────────────────────────────────
@router.post(
    "/calculate",
    response_model=SafetyScoreCalculateResponse,
    summary="Compute Explainable Safety Score",
    description="Calculates time-adjusted safety score with explainable +/- factor breakdown and personalized profile weights."
)
async def calculate_safety_score_endpoint(payload: SafetyScoreCalculateRequest) -> SafetyScoreCalculateResponse:
    w = payload.weights or SafetyScoreWeights()
    crime_w = w.crimeWeight or 1.0
    night_w = w.nightRiskWeight or 1.0
    women_mult = w.womenSafetyMultiplier or 1.0

    breakdown: List[FactorBreakdownItem] = []

    # 1. Base Score & Segment Deductions
    if payload.baseSafetyScore is not None:
        base_score = payload.baseSafetyScore
        breakdown.append(FactorBreakdownItem(factor="Baseline area profile", impact=round(base_score - 80.0, 1)))
    elif payload.segments and len(payload.segments) > 0:
        high_risk_count = sum(1 for s in payload.segments if s.riskLevel in ("HIGH", "CRITICAL"))
        med_risk_count = sum(1 for s in payload.segments if s.riskLevel == "MEDIUM")
        total_crimes = sum(s.crimeCount or 0 for s in payload.segments)

        base_val = 98.0
        # Deductions
        high_penalty = (high_risk_count * 15.0) * crime_w * women_mult
        med_penalty = (med_risk_count * 5.0) * crime_w
        crime_penalty = (total_crimes * 0.4) * crime_w

        if high_risk_count > 0:
            breakdown.append(FactorBreakdownItem(factor=f"{high_risk_count} high-risk segments", impact=-round(high_penalty, 1)))
        if med_risk_count > 0:
            breakdown.append(FactorBreakdownItem(factor=f"{med_risk_count} moderate-risk segments", impact=-round(med_penalty, 1)))
        if total_crimes > 0:
            breakdown.append(FactorBreakdownItem(factor=f"Historical crime incidents ({total_crimes})", impact=-round(crime_penalty, 1)))
        else:
            breakdown.append(FactorBreakdownItem(factor="Zero reported crimes along path", impact=10.0))

        base_score = max(20.0, min(98.0, base_val - high_penalty - med_penalty - crime_penalty))
    else:
        base_score = 82.0
        breakdown.append(FactorBreakdownItem(factor="Standard route baseline", impact=0.0))

    # 2. Time-of-day Multiplier & Impact
    multiplier, adjustment, bucket_label = get_time_multiplier(payload.atTime)
    if night_w > 1.0 and multiplier < 1.0:
        multiplier = max(0.40, multiplier - (night_w - 1.0) * 0.15)
        adjustment = round(multiplier - 1.0, 2)

    time_impact = round((base_score * multiplier) - base_score, 1)
    if time_impact < 0:
        breakdown.append(FactorBreakdownItem(factor=f"Night travel risk ({bucket_label})", impact=time_impact))
    elif time_impact > 0:
        breakdown.append(FactorBreakdownItem(factor="Daytime peak illumination", impact=time_impact))

    # 3. Women Safety Mode Factor
    if women_mult > 1.0:
        breakdown.append(FactorBreakdownItem(factor="Women Safety Mode sensitivity boost", impact=-5.0))

    # 4. Emergency POI Coverage Boost
    poi_boost = 8.0 * (w.emergencyPOIWeight or 1.0)
    breakdown.append(FactorBreakdownItem(factor="Emergency services coverage", impact=round(poi_boost, 1)))

    # 5. Final Score
    final_score = round(max(5.0, min(100.0, (base_score * multiplier))), 1)
    band = classify_score_band(final_score)

    return SafetyScoreCalculateResponse(
        safetyScore=final_score,
        baseSafetyScore=round(base_score, 1),
        band=band,
        timeAdjustment=adjustment,
        timeMultiplier=round(multiplier, 2),
        hourBucket=bucket_label,
        breakdown=breakdown
    )
