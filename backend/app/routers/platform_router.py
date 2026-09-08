"""
platform_router.py
API Router for Rakshak AI Layer 7 Platform features & Complete User Journey Lifecycle.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import Journey, IncidentReport, PoliceCaseLog, PlatformAuditLog, AdminSystemConfig
from ..journey_manager import (
    create_journey,
    start_journey,
    update_journey_telemetry,
    complete_journey,
)
from ..platform_layer import (
    get_system_health,
    get_data_quality_report,
    enforce_tool_permission,
    check_role_permission,
    UserRole,
    platform_cache,
)

router = APIRouter(prefix="/api/platform", tags=["Platform & Journey State Machine"])


# --- Schemas ---
class CreateJourneyRequest(BaseModel):
    start_lat: float
    start_lon: float
    dest_lat: float
    dest_lon: float
    start_name: str = "Start Location"
    dest_name: str = "Destination"
    route_type: str = "Safe"
    selected_route: Optional[Dict[str, Any]] = None
    safety_briefing: Optional[Dict[str, Any]] = None
    user_id: Optional[int] = None


class TelemetryRequest(BaseModel):
    current_lat: float
    current_lon: float
    deviation_threshold_km: float = 0.35


class CaseTransitionRequest(BaseModel):
    changed_by: str = "Police Desk"
    role: str = "POLICE_OFFICER"
    new_status: str  # Under Review, Verified, Officer Assigned, Investigation, Action Taken, Resolved, Closed
    action_note: Optional[str] = "Status updated in police workflow."
    evidence_urls: List[str] = []


# --- Health & Diagnostics ---
@router.get("/health")
async def platform_health_check(db: AsyncSession = Depends(get_db)):
    """System health across Database, PostGIS, Risk Engine, Routing, AI Agent, and Notifications."""
    cached = platform_cache.get("system_health")
    if cached:
        return cached
    health_data = await get_system_health(db)
    platform_cache.set("system_health", health_data, ttl_sec=30)
    return health_data


@router.get("/data-quality")
async def admin_data_quality(db: AsyncSession = Depends(get_db)):
    """Admin Data Quality & Dataset Ingestion Audit."""
    return await get_data_quality_report(db)


# --- Journey State Machine Endpoints ---
@router.post("/journey/create")
async def api_create_journey(req: CreateJourneyRequest, db: AsyncSession = Depends(get_db)):
    """Step 1: Create a PLANNED journey with briefing & selected route."""
    journey = await create_journey(
        db=db,
        start_lat=req.start_lat,
        start_lon=req.start_lon,
        dest_lat=req.dest_lat,
        dest_lon=req.dest_lon,
        start_name=req.start_name,
        dest_name=req.dest_name,
        route_type=req.route_type,
        selected_route=req.selected_route,
        safety_briefing=req.safety_briefing,
        user_id=req.user_id,
    )
    return {
        "status": "SUCCESS",
        "journey_uuid": journey.journey_uuid,
        "journey_status": journey.status,
        "start_name": journey.start_name,
        "dest_name": journey.dest_name,
        "created_at": journey.created_at.isoformat() if journey.created_at else None,
    }


@router.post("/journey/{journey_uuid}/start")
async def api_start_journey(journey_uuid: str, db: AsyncSession = Depends(get_db)):
    """Step 2: Start the journey (PLANNED -> STARTED / IN_PROGRESS)."""
    journey = await start_journey(db, journey_uuid)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {
        "status": "STARTED",
        "journey_uuid": journey.journey_uuid,
        "start_time": journey.start_time.isoformat() if journey.start_time else None,
        "expected_arrival": journey.expected_arrival.isoformat() if journey.expected_arrival else None,
    }


@router.post("/journey/{journey_uuid}/telemetry")
async def api_journey_telemetry(journey_uuid: str, req: TelemetryRequest, db: AsyncSession = Depends(get_db)):
    """Step 3: Live GPS telemetry & route deviation detection."""
    telemetry = await update_journey_telemetry(
        db=db,
        journey_uuid=journey_uuid,
        current_lat=req.current_lat,
        current_lon=req.current_lon,
        deviation_threshold_km=req.deviation_threshold_km,
    )
    if "error" in telemetry:
        raise HTTPException(status_code=404, detail=telemetry["error"])
    return telemetry


@router.post("/journey/{journey_uuid}/complete")
async def api_complete_journey(journey_uuid: str, db: AsyncSession = Depends(get_db)):
    """Step 4: Complete the journey (IN_PROGRESS -> ARRIVED) and return full post-journey safety summary."""
    summary = await complete_journey(db, journey_uuid)
    if not summary:
        raise HTTPException(status_code=404, detail="Journey not found")
    return summary


@router.get("/journey/{journey_uuid}")
async def api_get_journey(journey_uuid: str, db: AsyncSession = Depends(get_db)):
    """Fetch current journey state."""
    result = await db.execute(select(Journey).where(Journey.journey_uuid == journey_uuid))
    journey = result.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {
        "journey_uuid": journey.journey_uuid,
        "status": journey.status,
        "start_name": journey.start_name,
        "dest_name": journey.dest_name,
        "start_lat": journey.start_lat,
        "start_lon": journey.start_lon,
        "dest_lat": journey.dest_lat,
        "dest_lon": journey.dest_lon,
        "route_type": journey.route_type,
        "current_lat": journey.current_lat,
        "current_lon": journey.current_lon,
        "current_risk": journey.current_risk,
        "risk_level": journey.risk_level,
        "deviations_count": journey.deviations_count,
        "deviation_alerts": journey.deviation_alerts,
        "safety_briefing": journey.safety_briefing,
        "summary": journey.summary,
    }


# --- Police Case Lifecycle State Machine ---
VALID_CASE_STATUSES = [
    "Submitted",
    "Under Review",
    "Verified",
    "Officer Assigned",
    "Investigation",
    "Action Taken",
    "Resolved",
    "Closed"
]

@router.post("/police/case/{case_id}/transition")
async def api_transition_case(case_id: int, req: CaseTransitionRequest, db: AsyncSession = Depends(get_db)):
    """State machine transition for Police Case management."""
    if req.new_status not in VALID_CASE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {VALID_CASE_STATUSES}")

    res = await db.execute(select(IncidentReport).where(IncidentReport.id == case_id))
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Incident case not found")

    old_status = case.status
    case.status = req.new_status

    # Record in audit log
    log = PoliceCaseLog(
        report_id=case_id,
        changed_by=req.changed_by,
        role=req.role,
        old_status=old_status,
        new_status=req.new_status,
        action_note=req.action_note,
        evidence_urls=req.evidence_urls,
    )
    db.add(log)
    await db.commit()

    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "old_status": old_status,
        "new_status": req.new_status,
        "note": req.action_note,
    }


@router.get("/police/case/{case_id}/audit")
async def api_get_case_audit(case_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve complete transition history for a police case."""
    logs_res = await db.execute(
        select(PoliceCaseLog).where(PoliceCaseLog.report_id == case_id).order_by(PoliceCaseLog.timestamp.desc())
    )
    logs = logs_res.scalars().all()
    return [
        {
            "id": l.id,
            "changed_by": l.changed_by,
            "role": l.role,
            "old_status": l.old_status,
            "new_status": l.new_status,
            "action_note": l.action_note,
            "evidence_urls": l.evidence_urls,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]


# --- Admin Dynamic Configs ---
@router.get("/configs")
async def get_system_configs():
    """Expose editable platform thresholds."""
    return {
        "risk_weights": {"crime_density": 0.45, "night_penalty": 0.20, "cctv_credit": 0.15, "police_proximity": 0.20},
        "geofence_deviation_threshold_km": 0.35,
        "sos_alert_timeout_sec": 30,
        "disclaimer": "Historical Risk Indicator, not a safety guarantee."
    }
