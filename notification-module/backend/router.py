"""
router.py
Notification Module REST API.
"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from .dispatcher import dispatcher

router = APIRouter(prefix="/api/notify", tags=["Notification Engine Module"])


class EventNotificationRequest(BaseModel):
    event: str = Field(..., description="HIGH_RISK_ROUTE | SOS_TRIGGERED | CRIME_NEARBY | ROUTE_CHANGED | EMERGENCY_NEARBY", json_schema_extra={"example": "HIGH_RISK_ROUTE"})
    userId: str = Field(..., description="Target user identifier", json_schema_extra={"example": "usr_9921"})
    payload: Optional[Dict[str, Any]] = Field(default={}, description="Contextual dynamic payload for template interpolation")
    channels: Optional[List[str]] = Field(None, description="Optional override for delivery channels")


class EventNotificationResponse(BaseModel):
    status: str = Field("queued", description="Delivery status")
    notificationId: str
    event: str
    userId: str
    channels: List[str]
    preview: str
    timestamp: str


@router.post(
    "",
    response_model=EventNotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish Notification Event",
    description="Asynchronously queues and dispatches notifications across configured channel adapters."
)
async def publish_notification_event(payload: EventNotificationRequest) -> EventNotificationResponse:
    result = await dispatcher.enqueue_notification(
        event=payload.event,
        user_id=payload.userId,
        payload=payload.payload or {},
        channels=payload.channels
    )
    return EventNotificationResponse(**result)
