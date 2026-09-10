"""
router.py
FastAPI router for Live Location Module.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Path, status
from pydantic import BaseModel, Field

from .room_manager import live_location_manager

router = APIRouter(tags=["Live Location Module"])

class LocationUpdateRequest(BaseModel):
    sosId: str
    latitude: float
    longitude: float
    timestamp: Optional[str] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None
    battery: Optional[float] = None

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

@router.post("/api/live-location/update", response_model=LocationUpdateResponse)
async def push_location_update(payload: LocationUpdateRequest):
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
    return LocationUpdateResponse(**result)

@router.get("/api/live-location/{sosId}/trail", response_model=LiveTrailResponse)
async def get_live_location_trail(sosId: str = Path(...)):
    trail = live_location_manager.get_trail(sosId)
    return LiveTrailResponse(
        sosId=sosId,
        channel=live_location_manager.get_room_channel(sosId),
        totalPoints=len(trail),
        maxBufferLimit=live_location_manager.max_trail_points,
        trail=trail
    )

@router.websocket("/ws/live-location/{sosId}")
async def live_location_websocket_endpoint(websocket: WebSocket, sosId: str):
    await websocket.accept()
    trail_replay = await live_location_manager.join_room(sosId, websocket)

    await websocket.send_json({
        "type": "INITIAL_TRAIL_REPLAY",
        "channel": live_location_manager.get_room_channel(sosId),
        "sosId": sosId,
        "totalReplayedPoints": len(trail_replay),
        "trail": trail_replay,
        "connectedAt": datetime.now(timezone.utc).isoformat()
    })

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "LOCATION_PING":
                await live_location_manager.record_and_broadcast_location(
                    sos_id=sosId,
                    latitude=float(data["latitude"]),
                    longitude=float(data["longitude"]),
                    timestamp=data.get("timestamp"),
                    speed=data.get("speed"),
                    heading=data.get("heading"),
                    accuracy=data.get("accuracy"),
                    battery=data.get("battery")
                )
    except WebSocketDisconnect:
        live_location_manager.leave_room(sosId, websocket)
    except Exception:
        live_location_manager.leave_room(sosId, websocket)
