"""
simulator.py
Independent What-If Simulator Module for Rakshak AI.
Orchestration & interaction layer: re-runs Route Compare and Safety Scoring
under hypothetical scenarios (departure time, travel mode, lighting, weather, police patrol).
Zero database coupling.
"""
import os
import math
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("RakshakAI.Simulator")
router = APIRouter(prefix="/api/simulator", tags=["What-If Simulator Module"])

INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")

# ─── Configurable Scenario Weights ────────────────────────────────────────────────
SCENARIO_CONFIG = {
    # Travel mode impact factor on risk exposure
    "travel_mode_multipliers": {
        "driving": 1.00,      # baseline (enclosed vehicle)
        "solo_cab": 0.92,     # moderate exposure
        "transit": 0.95,     # public transit stops
        "walking": 0.78,      # high pedestrian vulnerability
    },
    # Lighting conditions impact
    "lighting_multipliers": {
        "well_lit": 1.05,     # well-lit arterial roads boost safety
        "moderate": 1.00,     # baseline
        "poor": 0.82,         # dark alleys / broken streetlights penalize safety
    },
    # Weather impact
    "weather_multipliers": {
        "clear": 1.00,
        "rain": 0.93,
        "heavy_rain": 0.86,
        "fog": 0.84,
    },
    # Police patrol density impact
    "patrol_multipliers": {
        "reduced": 0.88,
        "standard": 1.00,
        "enhanced": 1.15,     # active PCR vans & checkpoints boost safety
    }
}


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
class CoordinatePoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, json_schema_extra={"example": 28.6692})
    lng: float = Field(..., ge=-180.0, le=180.0, json_schema_extra={"example": 77.4538})


class ScenarioParameters(BaseModel):
    departureTime: Optional[str] = Field(
        None,
        description="Hypothetical departure time in ISO-8601 format (e.g. '2026-09-11T23:30:00+05:30')",
        json_schema_extra={"example": "2026-09-11T23:30:00+05:30"}
    )
    travelMode: Literal["driving", "solo_cab", "transit", "walking"] = Field(
        "driving",
        description="Mode of travel: driving, solo_cab, transit, walking",
        json_schema_extra={"example": "walking"}
    )
    lightingCondition: Literal["well_lit", "moderate", "poor"] = Field(
        "moderate",
        description="Street illumination level",
        json_schema_extra={"example": "poor"}
    )
    weatherCondition: Literal["clear", "rain", "heavy_rain", "fog"] = Field(
        "clear",
        description="Weather conditions",
        json_schema_extra={"example": "clear"}
    )
    policePatrol: Literal["reduced", "standard", "enhanced"] = Field(
        "standard",
        description="Police / PCR patrol density",
        json_schema_extra={"example": "standard"}
    )


class WhatIfSimulateRequest(BaseModel):
    source: CoordinatePoint
    destination: CoordinatePoint
    scenario: ScenarioParameters


class FactorImpactBreakdown(BaseModel):
    factor: str
    selectedOption: str
    multiplier: float
    impactPercent: float
    description: str


class WhatIfSimulateResponse(BaseModel):
    baselineScore: float = Field(..., description="Baseline safety score under standard daytime conditions")
    simulatedScore: float = Field(..., description="Adjusted safety score under simulated scenario")
    scoreDelta: float = Field(..., description="Absolute difference (simulatedScore - baselineScore)")
    percentageChange: float = Field(..., description="Percentage change in safety score")
    baselineBand: str = Field(..., description="Baseline risk band (High, Medium, Low)")
    simulatedBand: str = Field(..., description="Simulated risk band (High, Medium, Low)")
    factors: List[FactorImpactBreakdown] = Field(..., description="Individual contribution of each scenario factor")
    aiRecommendation: str = Field(..., description="Actionable safety guidance tailored to the scenario")
    simulatedRoutes: Optional[Dict[str, Any]] = Field(None, description="Re-evaluated Three-Route alternatives if available")


# ─── Helper Logic ────────────────────────────────────────────────────────────────
def classify_band(score: float) -> str:
    if score >= 80.0:
        return "High"
    elif score >= 50.0:
        return "Medium"
    else:
        return "Low"


def calculate_scenario_multiplier(scenario: ScenarioParameters) -> tuple[float, List[FactorImpactBreakdown]]:
    factors: List[FactorImpactBreakdown] = []
    combined_multiplier = 1.0

    # 1. Travel Mode
    mode_mult = SCENARIO_CONFIG["travel_mode_multipliers"].get(scenario.travelMode, 1.0)
    combined_multiplier *= mode_mult
    factors.append(
        FactorImpactBreakdown(
            factor="Travel Mode",
            selectedOption=scenario.travelMode.replace("_", " ").title(),
            multiplier=mode_mult,
            impactPercent=round((mode_mult - 1.0) * 100, 1),
            description=f"{scenario.travelMode.capitalize()} mode risk exposure"
        )
    )

    # 2. Lighting
    light_mult = SCENARIO_CONFIG["lighting_multipliers"].get(scenario.lightingCondition, 1.0)
    combined_multiplier *= light_mult
    factors.append(
        FactorImpactBreakdown(
            factor="Street Lighting",
            selectedOption=scenario.lightingCondition.replace("_", " ").title(),
            multiplier=light_mult,
            impactPercent=round((light_mult - 1.0) * 100, 1),
            description=f"Illumination condition: {scenario.lightingCondition}"
        )
    )

    # 3. Weather
    weather_mult = SCENARIO_CONFIG["weather_multipliers"].get(scenario.weatherCondition, 1.0)
    combined_multiplier *= weather_mult
    factors.append(
        FactorImpactBreakdown(
            factor="Weather Visibility",
            selectedOption=scenario.weatherCondition.replace("_", " ").title(),
            multiplier=weather_mult,
            impactPercent=round((weather_mult - 1.0) * 100, 1),
            description=f"Atmospheric condition: {scenario.weatherCondition}"
        )
    )

    # 4. Police Patrol
    patrol_mult = SCENARIO_CONFIG["patrol_multipliers"].get(scenario.policePatrol, 1.0)
    combined_multiplier *= patrol_mult
    factors.append(
        FactorImpactBreakdown(
            factor="Police Patrol Density",
            selectedOption=scenario.policePatrol.replace("_", " ").title(),
            multiplier=patrol_mult,
            impactPercent=round((patrol_mult - 1.0) * 100, 1),
            description=f"Law enforcement presence: {scenario.policePatrol}"
        )
    )

    return combined_multiplier, factors


# ─── REST Endpoint ───────────────────────────────────────────────────────────────
@router.post(
    "/what-if",
    response_model=WhatIfSimulateResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate What-If Safety Scenario",
    description="Re-evaluates safety scores under dynamic hypothetical parameters (time, mode, lighting, weather, patrol) without touching the database."
)
async def simulate_what_if_scenario(payload: WhatIfSimulateRequest) -> WhatIfSimulateResponse:
    # 1. Fetch baseline & time-adjusted routes via Route Compare Module
    route_compare_url = f"{INTERNAL_API_BASE}/api/routes/compare"
    simulated_routes = None
    baseline_score = 82.0

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Baseline query (no time)
            base_res = await client.post(
                route_compare_url,
                json={"source": payload.source.model_dump(), "destination": payload.destination.model_dump()}
            )
            if base_res.status_code == 200:
                base_data = base_res.json()
                baseline_score = float(base_data.get("safest", {}).get("safetyScore", 82.0))

            # Query with time
            if payload.scenario.departureTime:
                sim_res = await client.post(
                    route_compare_url,
                    json={
                        "source": payload.source.model_dump(),
                        "destination": payload.destination.model_dump(),
                        "atTime": payload.scenario.departureTime
                    }
                )
                if sim_res.status_code == 200:
                    simulated_routes = sim_res.json()
        except Exception as e:
            logger.warning("Downstream Route Compare call failed in simulator, using statistical baseline: %s", e)

    # 2. Extract time multiplier if departure time specified
    time_mult = 1.0
    if payload.scenario.departureTime:
        try:
            dt = datetime.fromisoformat(payload.scenario.departureTime.replace("Z", "+00:00"))
            hour = dt.hour + (dt.minute / 60.0)
            if 1.0 <= hour < 5.0:
                time_mult = 0.55
            elif 5.0 <= hour < 6.0:
                time_mult = 0.90
            elif 6.0 <= hour < 19.0:
                time_mult = 1.00
            elif 19.0 <= hour < 23.0:
                time_mult = 0.85
            else:
                time_mult = 0.65
        except Exception:
            pass

    # 3. Calculate compound scenario multiplier & breakdown
    scenario_mult, factor_breakdowns = calculate_scenario_multiplier(payload.scenario)

    if payload.scenario.departureTime:
        factor_breakdowns.insert(
            0,
            FactorImpactBreakdown(
                factor="Time of Day",
                selectedOption=payload.scenario.departureTime,
                multiplier=time_mult,
                impactPercent=round((time_mult - 1.0) * 100, 1),
                description=f"Hourly safety factor ({round(time_mult, 2)}x)"
            )
        )

    compound_multiplier = time_mult * scenario_mult
    simulated_score = round(max(5.0, min(100.0, baseline_score * compound_multiplier)), 1)
    score_delta = round(simulated_score - baseline_score, 1)
    pct_change = round(((simulated_score - baseline_score) / max(1.0, baseline_score)) * 100, 1)

    baseline_band = classify_band(baseline_score)
    simulated_band = classify_band(simulated_score)

    # 4. Synthesize AI Guidance
    if score_delta >= 5.0:
        recommendation = f"Favorable conditions! Safety Score improves by +{score_delta} pts ({pct_change}% boost). Enhanced police presence and high visibility make this route very secure."
    elif score_delta <= -20.0:
        recommendation = f"High Risk Warning: Safety Score drops by {score_delta} pts ({pct_change}% decline). Traveling during late hours by {payload.scenario.travelMode} in poor lighting substantially increases vulnerability. Switch to Safest Route or travel before 20:00."
    elif score_delta < 0.0:
        recommendation = f"Moderate caution advised: Safety Score decreases by {abs(score_delta)} pts ({pct_change}%). Stick to main arterial roads and keep live tracking enabled."
    else:
        recommendation = "Standard baseline safety conditions. Safe navigation route active."

    return WhatIfSimulateResponse(
        baselineScore=round(baseline_score, 1),
        simulatedScore=simulated_score,
        scoreDelta=score_delta,
        percentageChange=pct_change,
        baselineBand=baseline_band,
        simulatedBand=simulated_band,
        factors=factor_breakdowns,
        aiRecommendation=recommendation,
        simulatedRoutes=simulated_routes
    )
