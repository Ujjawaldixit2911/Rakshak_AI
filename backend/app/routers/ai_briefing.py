"""
ai_briefing.py
AI Safety Briefing Module Router for Rakshak AI.
Receives already-computed structured JSON from Route Compare and Safety Score modules,
and transforms it into a natural-language safety summary via LLM or deterministic fallback.
"""
import logging
from typing import Optional, Dict, Any, Literal, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.ai_briefing.llm_client import generate_safety_briefing

logger = logging.getLogger("RakshakAI.AIBriefing")
router = APIRouter(prefix="/api/ai", tags=["AI Safety Briefing Module"])


class AlternativeRouteBriefingInfo(BaseModel):
    type: str = Field("safest", description="Alternative type: safest, fastest, balanced", json_schema_extra={"example": "safest"})
    duration: float = Field(..., ge=0.0, description="Alternative route duration in minutes", json_schema_extra={"example": 44})
    safetyScore: float = Field(..., ge=0.0, le=100.0, description="Alternative route safety score", json_schema_extra={"example": 94})
    distance: Optional[float] = Field(None, description="Alternative distance in km", json_schema_extra={"example": 15.1})


class SafetyBriefingRequest(BaseModel):
    distance: float = Field(..., ge=0.0, description="Selected route distance in km", json_schema_extra={"example": 14.2})
    duration: float = Field(..., ge=0.0, description="Selected route travel time in minutes", json_schema_extra={"example": 38})
    safetyScore: float = Field(..., ge=0.0, le=100.0, description="Safety Score (0-100)", json_schema_extra={"example": 58})
    hotspots: int = Field(0, ge=0, description="Count of historical crime hotspots along route", json_schema_extra={"example": 2})
    highRiskSegments: int = Field(0, ge=0, description="Count of high-risk polyline segments", json_schema_extra={"example": 1})
    breakdown: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional structured explainable factor contributions (+/- impacts)",
        json_schema_extra={"example": [{"factor": "Low crime density", "impact": 12}, {"factor": "Night travel", "impact": -8}]}
    )
    alternative: Optional[AlternativeRouteBriefingInfo] = Field(
        None,
        description="Optional comparative alternative route (e.g. Safest or Fastest option)",
        json_schema_extra={"example": {"type": "safest", "duration": 44, "safetyScore": 94}}
    )


class SafetyBriefingResponse(BaseModel):
    briefing: str = Field(..., description="Natural-language safety briefing explanation")
    source: str = Field(..., description="Generation engine: anthropic_claude | groq_llama | deterministic_template")
    model: Optional[str] = Field(None, description="Model identifier used")


@router.post(
    "/briefing",
    response_model=SafetyBriefingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI Safety Briefing",
    description="Translates pre-computed route risk & safety metrics into a clear, anti-hallucination natural language briefing."
)
async def generate_briefing_endpoint(payload: SafetyBriefingRequest) -> SafetyBriefingResponse:
    # Convert Pydantic request to dictionary
    data_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()

    result = await generate_safety_briefing(data_dict, timeout_sec=6.0)

    return SafetyBriefingResponse(
        briefing=result["briefing"],
        source=result["source"],
        model=result.get("model")
    )
