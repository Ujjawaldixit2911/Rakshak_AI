"""
agent.py
FastAPI Router for Rakshak AI Copilot (Supervisor Agent & Sub-agents API).
Supports tool auditing, structured form extractions, and confirmation-gated actions.
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.agent.supervisor import SupervisorAgent

logger = logging.getLogger("RakshakAI.AgentRouter")
router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    message: str
    city: Optional[str] = "Delhi"
    history: Optional[List[Dict[str, str]]] = []
    admin_mode: Optional[bool] = False
    confirmed_action: Optional[Dict[str, Any]] = None


class PreJourneyBriefingRequest(BaseModel):
    origin_name: str
    dest_name: str
    city: Optional[str] = "Delhi"
    time_of_day: Optional[str] = "Night"
    mode: Optional[str] = "safest"


@router.post("/chat")
async def agent_chat_endpoint(
    req: AgentChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Main Agentic Supervisor endpoint.
    Orchestrates sub-agents, calls real database tools, provides tool audit logs,
    and returns explainable recommendations.
    """
    try:
        result = await SupervisorAgent.process_user_query(
            db=db,
            message=req.message,
            city=req.city or "Delhi",
            history=req.history,
            admin_mode=req.admin_mode or False,
            confirmed_action=req.confirmed_action
        )
        return result
    except Exception as e:
        logger.error(f"Agent execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent runtime error: {str(e)}")


@router.post("/pre-journey-briefing")
async def get_pre_journey_briefing(
    req: PreJourneyBriefingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates structured Pre-Journey Safety Briefing for a specific origin-destination pair.
    """
    prompt = f"Pre-journey safety briefing for route from {req.origin_name} to {req.dest_name} at {req.time_of_day}"
    return await SupervisorAgent.process_user_query(
        db=db,
        message=prompt,
        city=req.city or "Delhi"
    )
