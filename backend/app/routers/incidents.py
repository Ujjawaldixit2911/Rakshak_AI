"""
incidents.py
Incident Reporting Module for Rakshak AI.
Owns community crime/safety reports:
- POST /api/incidents (Report incident, rate-limited per user, photo URL storage)
- GET /api/incidents (Filter by status, userId, pagination)
- GET /api/incidents/{id}
- PATCH /api/incidents/{id}/status (Admin-only role gated; on 'Verified', calls Crime Data Module's POST /api/crimes)
- Zero direct coupling to Crime Data Module database.
"""
import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from ..database import get_db
from ..models import Incident

logger = logging.getLogger("RakshakAI.Incidents")
router = APIRouter(prefix="/api/incidents", tags=["Incident Reporting Module"])

INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")
MAX_SUBMISSIONS_PER_MINUTE = 5

# In-memory sliding window rate limiter for spam prevention
_user_submission_history: Dict[str, List[float]] = {}


def check_rate_limit(user_id: str) -> None:
    now = time.time()
    history = _user_submission_history.get(user_id, [])
    # Keep only timestamps from last 60 seconds
    history = [t for t in history if now - t < 60.0]
    if len(history) >= MAX_SUBMISSIONS_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {MAX_SUBMISSIONS_PER_MINUTE} reports allowed per minute."
        )
    history.append(now)
    _user_submission_history[user_id] = history


IncidentStatusType = Literal["Reported", "Under Review", "Verified", "Rejected"]


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────────
class CreateIncidentRequest(BaseModel):
    userId: str = Field(..., min_length=1, description="User identifier", json_schema_extra={"example": "usr_7712"})
    crimeType: str = Field(..., min_length=2, description="Type of incident (e.g. Harassment, Theft, Vandalism, Poor Lighting)", json_schema_extra={"example": "Harassment"})
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude", json_schema_extra={"example": 28.6250})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude", json_schema_extra={"example": 77.2180})
    description: Optional[str] = Field(None, description="Detailed text description", json_schema_extra={"example": "Streetlights broken near metro exit, suspicious activity observed."})
    photoUrl: Optional[str] = Field(None, description="URL pointing to uploaded photo in object storage", json_schema_extra={"example": "https://storage.rakshak-ai.org/reports/img_9912.jpg"})


class UpdateIncidentStatusRequest(BaseModel):
    status: IncidentStatusType = Field(..., description="Target status: Reported, Under Review, Verified, Rejected")
    adminNotes: Optional[str] = Field(None, description="Optional admin review remarks")


class IncidentResponse(BaseModel):
    id: int
    userId: str
    crimeType: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    photoUrl: Optional[str] = None
    status: str
    createdAt: str


class PaginatedIncidentsResponse(BaseModel):
    total: int
    page: int
    limit: int
    incidents: List[IncidentResponse]


# ─── Helper Model Serializer ─────────────────────────────────────────────────────
def incident_to_response(inc: Incident) -> IncidentResponse:
    created_iso = inc.created_at.isoformat() if inc.created_at else datetime.now(timezone.utc).isoformat()
    return IncidentResponse(
        id=inc.id,
        userId=inc.user_id,
        crimeType=inc.crime_type,
        latitude=inc.latitude,
        longitude=inc.longitude,
        description=inc.description,
        photoUrl=inc.photo_url,
        status=inc.status or "Reported",
        createdAt=created_iso
    )


# ─── REST Endpoints ───────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Incident Report",
    description="Submits a community safety incident report. Unverified until approved by administrators."
)
async def submit_incident_report(
    payload: CreateIncidentRequest,
    db: AsyncSession = Depends(get_db)
) -> IncidentResponse:
    # 1. Spam Guard: Rate-limiting per user
    check_rate_limit(payload.userId)

    # 2. Persist Incident
    incident = Incident(
        user_id=payload.userId,
        crime_type=payload.crimeType.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description.strip() if payload.description else None,
        photo_url=payload.photoUrl.strip() if payload.photoUrl else None,
        status="Reported"
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    logger.info("📢 New community incident report created: ID #%d by %s", incident.id, payload.userId)
    return incident_to_response(incident)


@router.get(
    "",
    response_model=PaginatedIncidentsResponse,
    summary="List Incident Reports",
    description="Retrieves community incident reports with optional filtering by status and userId."
)
async def list_incident_reports(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. Reported, Verified)"),
    userId: Optional[str] = Query(None, description="Filter by reporting user ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Page size limit"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedIncidentsResponse:
    conditions = []
    if status_filter:
        conditions.append(Incident.status == status_filter.strip())
    if userId:
        conditions.append(Incident.user_id == userId.strip())

    # Count total
    count_stmt = select(func.count(Incident.id))
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    count_res = await db.execute(count_stmt)
    total_count = count_res.scalar() or 0

    # Query items
    stmt = select(Incident)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.order_by(Incident.created_at.desc(), Incident.id.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)

    records_res = await db.execute(stmt)
    records = records_res.scalars().all()

    return PaginatedIncidentsResponse(
        total=total_count,
        page=page,
        limit=limit,
        incidents=[incident_to_response(r) for r in records]
    )


@router.get(
    "/{id}",
    response_model=IncidentResponse,
    summary="Get Incident Details",
    description="Retrieves a specific incident report by its unique ID."
)
async def get_incident_by_id(
    id: int,
    db: AsyncSession = Depends(get_db)
) -> IncidentResponse:
    stmt = select(Incident).where(Incident.id == id)
    res = await db.execute(stmt)
    incident = res.scalars().first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{id} not found."
        )
    return incident_to_response(incident)


@router.patch(
    "/{id}/status",
    response_model=IncidentResponse,
    summary="Update Incident Status (Admin Only)",
    description="Updates incident review status. Promoting status to 'Verified' triggers POST /api/crimes to insert into authoritative dataset."
)
async def update_incident_status(
    id: int,
    payload: UpdateIncidentStatusRequest,
    x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> IncidentResponse:
    # 1. Enforce Admin / Police Role Auth
    role = (x_admin_role or "").lower().strip()
    is_admin = role in ("admin", "police", "supervisor") or (authorization and "admin" in authorization.lower())
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Police privileges required to update incident status."
        )

    # 2. Fetch target incident
    stmt = select(Incident).where(Incident.id == id)
    res = await db.execute(stmt)
    incident = res.scalars().first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident #{id} not found."
        )

    old_status = incident.status
    new_status = payload.status
    incident.status = new_status
    await db.commit()
    await db.refresh(incident)

    logger.info("👮 [Incident Admin] Incident #%d status transitioned: '%s' -> '%s'", id, old_status, new_status)

    # 3. CRITICAL PROMOTION RULE: If verified, call Crime Data Module's POST /api/crimes over REST
    if new_status == "Verified" and old_status != "Verified":
        await promote_incident_to_crime_module(incident)

    return incident_to_response(incident)


async def promote_incident_to_crime_module(incident: Incident) -> None:
    """
    Calls the Crime Data Module REST API to persist the verified incident
    into the authoritative crime dataset with source='user_report_verified'.
    """
    url = f"{INTERNAL_API_BASE}/api/crimes"
    crime_payload = {
        "crimeType": incident.crime_type,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "date": incident.created_at.strftime("%Y-%m-%d") if incident.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "time": incident.created_at.strftime("%H:%M:%S") if incident.created_at else datetime.now(timezone.utc).strftime("%H:%M:%S"),
        "severity": "medium",
        "location": incident.description or "User Reported Verified Zone",
        "source": "user_report_verified"
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(url, json=crime_payload)
            if res.status_code in (200, 201):
                logger.info("✅ Incident #%d successfully promoted to authoritative Crime Data Module.", incident.id)
            else:
                logger.warning("Failed to promote incident #%d to Crime Module (HTTP %s): %s", incident.id, res.status_code, res.text)
    except Exception as e:
        logger.error("Error promoting incident #%d to Crime Module: %s", incident.id, e)
