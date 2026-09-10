"""
router.py
FastAPI router for standalone AI Safety Briefing Module.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from .llm_client import generate_safety_briefing

router = APIRouter(prefix="/api/ai", tags=["AI Safety Briefing Module"])

class AlternativeRouteBriefingInfo(BaseModel):
    type: str = "safest"
    duration: float
    safetyScore: float
    distance: Optional[float] = None

class SafetyBriefingRequest(BaseModel):
    distance: float
    duration: float
    safetyScore: float
    hotspots: int = 0
    highRiskSegments: int = 0
    alternative: Optional[AlternativeRouteBriefingInfo] = None

class SafetyBriefingResponse(BaseModel):
    briefing: str
    source: str
    model: Optional[str] = None

@router.post("/briefing", response_model=SafetyBriefingResponse)
async def generate_briefing(payload: SafetyBriefingRequest):
    data_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    res = await generate_safety_briefing(data_dict, timeout_sec=6.0)
    return SafetyBriefingResponse(**res)
