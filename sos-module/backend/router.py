"""
router.py
FastAPI router for standalone SOS Module.
"""
import time
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, Path, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import SOSEvent
from .event_bus import sos_event_bus

router = APIRouter(prefix="/api/sos", tags=["SOS Emergency Module"])

SOSStatus = Literal["ACTIVE", "RESOLVED", "CANCELLED"]

RATE_LIMIT_WINDOW_SECONDS = 60
MAX_TRIGGERS_PER_WINDOW = 5
user_trigger_history: Dict[str, List[float]] = {}

def check_rate_limit(user_id: str) -> bool:
    now = time.time()
    history = [t for t in user_trigger_history.get(user_id, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(history) >= MAX_TRIGGERS_PER_WINDOW:
        user_trigger_history[user_id] = history
        return False
    history.append(now)
    user_trigger_history[user_id] = history
    return True

class SOSTriggerRequest(BaseModel):
    userId: str
    latitude: float
    longitude: float
    emergencyType: Optional[str] = "Immediate Threat / Harassment"
    metadata: Optional[Dict[str, Any]] = None

class SOSTriggerResponse(BaseModel):
    sosId: str
    status: str
    timestamp: str
    userId: str
    latitude: float
    longitude: float
    nearestEmergencyPois: List[Dict[str, Any]] = []

class SOSResolveResponse(BaseModel):
    sosId: str
    status: str
    resolvedAt: str

class SOSEventDetails(BaseModel):
    sosId: str
    userId: str
    latitude: float
    longitude: float
    status: str
    timestamp: str
    resolvedAt: Optional[str] = None
    metadata: Dict[str, Any] = {}

class SOSUpdateRequest(BaseModel):
    status: Optional[SOSStatus] = None
    note: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

async def get_db_stub():
    raise NotImplementedError("Database dependency must be injected by host app")

@router.post("/trigger", response_model=SOSTriggerResponse, status_code=status.HTTP_201_CREATED)
async def trigger_sos(
    payload: SOSTriggerRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db_stub)
):
    if not check_rate_limit(payload.userId):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before triggering another SOS.")

    now_utc = datetime.now(timezone.utc)
    new_event = SOSEvent(
        user_id=payload.userId,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="ACTIVE",
        timestamp=now_utc,
        metadata_info=payload.metadata or {"emergencyType": payload.emergencyType}
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)

    event_payload = {
        "sosId": str(new_event.id),
        "userId": payload.userId,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "timestamp": now_utc.isoformat(),
        "status": "ACTIVE",
    }
    await sos_event_bus.publish("SOS_TRIGGERED", event_payload)

    return SOSTriggerResponse(
        sosId=str(new_event.id),
        status="ACTIVE",
        timestamp=now_utc.isoformat(),
        userId=payload.userId,
        latitude=payload.latitude,
        longitude=payload.longitude
    )

@router.post("/{sosId}/resolve", response_model=SOSResolveResponse)
async def resolve_sos(sosId: int = Path(...), db: AsyncSession = Depends(get_db_stub)):
    stmt = select(SOSEvent).where(SOSEvent.id == sosId)
    res = await db.execute(stmt)
    event = res.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="SOS event not found")

    now_utc = datetime.now(timezone.utc)
    event.status = "RESOLVED"
    event.resolved_at = now_utc
    await db.commit()

    await sos_event_bus.publish("SOS_RESOLVED", {"sosId": str(event.id), "userId": event.user_id, "resolvedAt": now_utc.isoformat()})
    return SOSResolveResponse(sosId=str(event.id), status="RESOLVED", resolvedAt=now_utc.isoformat())

@router.patch("/{sosId}", response_model=SOSEventDetails)
async def update_sos_event(
    payload: SOSUpdateRequest,
    sosId: int = Path(...),
    db: AsyncSession = Depends(get_db_stub)
) -> SOSEventDetails:
    stmt = select(SOSEvent).where(SOSEvent.id == sosId)
    res = await db.execute(stmt)
    event = res.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="SOS event not found")

    if payload.status:
        event.status = payload.status
        if payload.status in ("RESOLVED", "CANCELLED") and not event.resolved_at:
            event.resolved_at = datetime.now(timezone.utc)

    current_meta = dict(event.metadata_info or {})
    if payload.metadata:
        current_meta.update(payload.metadata)
    if payload.note:
        current_meta["lastNote"] = payload.note
    event.metadata_info = current_meta

    await db.commit()
    await sos_event_bus.publish("SOS_STATUS_UPDATED", {"sosId": str(event.id), "userId": event.user_id, "newStatus": event.status})

    return SOSEventDetails(
        sosId=str(event.id),
        userId=event.user_id,
        latitude=event.latitude,
        longitude=event.longitude,
        status=event.status,
        timestamp=event.timestamp.isoformat() if event.timestamp else datetime.now(timezone.utc).isoformat(),
        resolvedAt=event.resolved_at.isoformat() if event.resolved_at else None,
        metadata=event.metadata_info or {}
    )

@router.get("/{sosId}", response_model=SOSEventDetails)
async def get_sos_event(sosId: int = Path(...), db: AsyncSession = Depends(get_db_stub)) -> SOSEventDetails:
    stmt = select(SOSEvent).where(SOSEvent.id == sosId)
    res = await db.execute(stmt)
    event = res.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="SOS event not found")

    return SOSEventDetails(
        sosId=str(event.id),
        userId=event.user_id,
        latitude=event.latitude,
        longitude=event.longitude,
        status=event.status,
        timestamp=event.timestamp.isoformat() if event.timestamp else datetime.now(timezone.utc).isoformat(),
        resolvedAt=event.resolved_at.isoformat() if event.resolved_at else None,
        metadata=event.metadata_info or {}
    )

