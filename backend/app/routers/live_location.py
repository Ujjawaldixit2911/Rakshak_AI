"""
live_location.py
Live Location Sharing Router for Rakshak AI.
Activated during an active SOS event, streams real-time GPS updates to trusted contacts.
Exposes:
- POST /api/live-location/update (Location telemetry ingestion)
- GET /api/live-location/{sosId}/trail (Rolling N-point trail history)
- GET /api/live-location/{sosId}/status (Active viewers & channel metadata)
- WebSocket /ws/live-location/{sosId} (Real-time live telemetry stream scoped to sosId room)
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import SOSEvent
from app.live_location_manager import live_location_manager
from app.event_bus import sos_event_bus

logger = logging.getLogger("RakshakAI.LiveLocationRouter")
router = APIRouter(tags=["Live Location Sharing Module"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class LocationUpdateRequest(BaseModel):
    sosId: str = Field(..., description="ID of the associated active SOS event", json_schema_extra={"example": "1"})
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Current GPS latitude coordinate", json_schema_extra={"example": 28.6139})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Current GPS longitude coordinate", json_schema_extra={"example": 77.2090})
    timestamp: Optional[str] = Field(None, description="ISO 8601 GPS ping timestamp", json_schema_extra={"example": "2026-09-11T02:00:00Z"})
    speed: Optional[float] = Field(None, description="Estimated velocity in km/h", json_schema_extra={"example": 14.5})
    heading: Optional[float] = Field(None, description="Compass heading in degrees (0-360)", json_schema_extra={"example": 180})
    accuracy: Optional[float] = Field(None, description="GPS accuracy radius in meters", json_schema_extra={"example": 8.0})
    battery: Optional[float] = Field(None, description="User device battery percentage", json_schema_extra={"example": 78})


class LocationUpdateResponse(BaseModel):
    status: str = "broadcasted"
    sosId: str
    subscribersCount: int
    totalTrailPoints: int
    point: Dict[str, Any]


class LiveTrailResponse(BaseModel):
    sosId: str
    channel: str
    totalPoints: int
    maxBufferLimit: int
    trail: List[Dict[str, Any]]


class LiveStatusResponse(BaseModel):
    sosId: str
    channel: str
    sosStatus: str
    activeViewers: int
    bufferedPointsCount: int
    lastPing: Optional[Dict[str, Any]] = None


# ─── Auto-wire Pub/Sub to auto-close rooms on SOS resolution ───────────────────
async def handle_sos_ended_event(payload: Dict[str, Any]):
    sos_id = payload.get("sosId")
    final_status = payload.get("status") or payload.get("newStatus") or "RESOLVED"
    if sos_id:
        logger.info("🔒 [LiveLocation] Auto-closing WebSocket room for ended SOS #%s", sos_id)
        await live_location_manager.close_room_on_sos_ended(str(sos_id), final_status=final_status)

sos_event_bus.subscribe("SOS_RESOLVED", handle_sos_ended_event)
sos_event_bus.subscribe("SOS_CANCELLED", handle_sos_ended_event)


# ─── Helper: Validate Active SOS Event ─────────────────────────────────────────
async def validate_active_sos(sos_id: str, db: AsyncSession) -> SOSEvent:
    """
    Validates that the target SOSEvent exists and is in ACTIVE status.
    Raises HTTPException if non-existent or inactive.
    """
    try:
        sos_int = int(sos_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sosId format.")

    stmt = select(SOSEvent).where(SOSEvent.id == sos_int)
    res = await db.execute(stmt)
    event = res.scalars().first()

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"SOS Event #{sos_id} not found.")

    if event.status != "ACTIVE":
        # Ensure room is closed
        await live_location_manager.close_room_on_sos_ended(sos_id, final_status=event.status)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update location: SOS event #{sos_id} is already {event.status}."
        )

    return event


# ─── REST Endpoints ───────────────────────────────────────────────────────────
@router.post(
    "/api/live-location/update",
    response_model=LocationUpdateResponse,
    summary="Push Live Location GPS Ping",
    description="Ingests GPS ping from user device, validates active SOS status, appends to rolling trail, and broadcasts over WebSocket room."
)
async def push_location_update(
    payload: LocationUpdateRequest,
    db: AsyncSession = Depends(get_db)
) -> LocationUpdateResponse:
    # 1. Validate SOS status is ACTIVE
    await validate_active_sos(payload.sosId, db)

    # 2. Record point in rolling buffer and broadcast to room
    result = await live_location_manager.record_and_broadcast_location(
        sos_id=payload.sosId,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timestamp=payload.timestamp,
        speed=payload.speed,
        heading=payload.heading,
        accuracy=payload.accuracy,
        battery=payload.battery
    )

    return LocationUpdateResponse(
        status=result["status"],
        sosId=result["sosId"],
        subscribersCount=result["subscribersCount"],
        totalTrailPoints=result["totalTrailPoints"],
        point=result["point"]
    )


@router.get(
    "/api/live-location/{sosId}/trail",
    response_model=LiveTrailResponse,
    summary="Get Rolling GPS Trail History",
    description="Retrieves the rolling buffer of the last N GPS points for reconnect/initial load scenarios."
)
async def get_live_location_trail(
    sosId: str = Path(..., description="SOS Event identifier")
) -> LiveTrailResponse:
    trail = live_location_manager.get_trail(sosId)
    return LiveTrailResponse(
        sosId=sosId,
        channel=live_location_manager.get_room_channel(sosId),
        totalPoints=len(trail),
        maxBufferLimit=live_location_manager.max_trail_points,
        trail=trail
    )


@router.get(
    "/api/live-location/{sosId}/status",
    response_model=LiveStatusResponse,
    summary="Get Live Location Channel Status",
    description="Returns active viewer count, last GPS ping, and channel room status."
)
async def get_live_location_status(
    sosId: str = Path(..., description="SOS Event identifier"),
    db: AsyncSession = Depends(get_db)
) -> LiveStatusResponse:
    try:
        sos_int = int(sosId)
        stmt = select(SOSEvent).where(SOSEvent.id == sos_int)
        res = await db.execute(stmt)
        event = res.scalars().first()
        sos_status = event.status if event else "UNKNOWN"
    except Exception:
        sos_status = "UNKNOWN"

    trail = live_location_manager.get_trail(sosId)
    last_point = trail[-1] if trail else None

    return LiveStatusResponse(
        sosId=sosId,
        channel=live_location_manager.get_room_channel(sosId),
        sosStatus=sos_status,
        activeViewers=live_location_manager.get_subscribers_count(sosId),
        bufferedPointsCount=len(trail),
        lastPing=last_point
    )


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────
@router.websocket("/ws/live-location/{sosId}")
async def live_location_websocket_endpoint(
    websocket: WebSocket,
    sosId: str
):
    """
    Real-time WebSocket streaming room for an SOS event (Channel: sos:{sosId}:location).
    - On connect: Sends initial replay of rolling GPS trail and status.
    - Streams: Receives and broadcasts real-time GPS pings to all trusted contacts in the room.
    - Closes: Automatically terminates when the SOS event is resolved or cancelled.
    """
    await websocket.accept()
    trail_replay = await live_location_manager.join_room(sosId, websocket)

    # Send initial connection handshake with trail history
    await websocket.send_json({
        "type": "INITIAL_TRAIL_REPLAY",
        "channel": live_location_manager.get_room_channel(sosId),
        "sosId": sosId,
        "totalReplayedPoints": len(trail_replay),
        "trail": trail_replay,
        "connectedAt": datetime.now(timezone.utc).isoformat(),
        "message": f"Connected to live tracking room sos:{sosId}:location"
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "ping")

            if msg_type == "LOCATION_PING":
                lat = data.get("latitude")
                lng = data.get("longitude")
                if lat is not None and lng is not None:
                    await live_location_manager.record_and_broadcast_location(
                        sos_id=sosId,
                        latitude=float(lat),
                        longitude=float(lng),
                        timestamp=data.get("timestamp"),
                        speed=data.get("speed"),
                        heading=data.get("heading"),
                        accuracy=data.get("accuracy"),
                        battery=data.get("battery")
                    )
            elif msg_type == "HEARTBEAT":
                await websocket.send_json({"type": "HEARTBEAT_ACK", "timestamp": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        live_location_manager.leave_room(sosId, websocket)
    except Exception as e:
        logger.warning("WebSocket error in room %s: %s", sosId, e)
        live_location_manager.leave_room(sosId, websocket)
