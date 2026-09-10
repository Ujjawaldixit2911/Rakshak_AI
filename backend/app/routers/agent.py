"""
agent.py
FastAPI Router for Rakshak AI Copilot (Supervisor Agent & Modular Tool-Calling AI Agent API).
Supports tool auditing, structured form extractions, confirmation-gated actions,
and pure REST-tool agentic orchestration via POST /api/agent/query.
"""
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.agent.supervisor import SupervisorAgent
from app.agent.schemas import AgentQueryRequest, AgentQueryResponse
from app.agent.orchestrator import AIAgentOrchestrator

logger = logging.getLogger("RakshakAI.AgentRouter")
router = APIRouter(prefix="/api/agent", tags=["AI Agent Module"])


# ─── Legacy Copilot Models ────────────────────────────────────────────────────────
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


# ─── Tool-Calling Agentic Query Endpoint ──────────────────────────────────────────
@router.post(
    "/query",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query AI Safety Agent",
    description="Tool-calling AI Agent that orchestrates Location, Route, Risk, and Emergency POI modules over REST APIs without touching databases directly."
)
async def agent_query_endpoint(payload: AgentQueryRequest) -> AgentQueryResponse:
    """
    Main Agentic Orchestration endpoint.
    Agent -> Tools -> Backend APIs -> Services -> Database.
    Never touches any database table directly.
    """
    try:
        orchestrator = AIAgentOrchestrator()
        user_loc_dict = payload.userLocation.model_dump() if payload.userLocation else None

        result = await orchestrator.run(
            message=payload.message,
            user_id=payload.userId,
            user_location=user_loc_dict,
            conversation_history=payload.conversationHistory
        )
        return result
    except Exception as e:
        logger.error(f"Agent query execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")


# ─── Legacy Copilot Supervisor Endpoints ──────────────────────────────────────────
@router.post("/chat")
async def agent_chat_endpoint(
    req: AgentChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Supervisor endpoint for interactive copilot sessions.
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
