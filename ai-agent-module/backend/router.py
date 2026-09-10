"""
router.py
FastAPI Router for AI Agent Module.
Exposes POST /api/agent/query with structured tool auditing and natural language responses.
"""
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
import httpx

from .schemas import AgentQueryRequest, AgentQueryResponse
from .orchestrator import AIAgentOrchestrator

logger = logging.getLogger("RakshakAI.Agent.Router")
router = APIRouter(prefix="/api/agent", tags=["AI Agent Module"])


@router.post(
    "/query",
    response_model=AgentQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Query AI Safety Agent",
    description="Agentic orchestration using native tool calling over REST APIs. Never accesses database directly."
)
async def query_agent_endpoint(payload: AgentQueryRequest) -> AgentQueryResponse:
    orchestrator = AIAgentOrchestrator()
    user_loc_dict = payload.userLocation.model_dump() if payload.userLocation else None

    result = await orchestrator.run(
        message=payload.message,
        user_id=payload.userId,
        user_location=user_loc_dict,
        conversation_history=payload.conversationHistory
    )

    return result
