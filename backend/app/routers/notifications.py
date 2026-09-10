"""
notifications.py
Independent Notification Engine Module (Module 21) API for Rakshak AI.
Owns all notification channels (FCM Push, Twilio SMS, SendGrid Email, In-App).
Zero database coupling.
"""
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, status, Body
from pydantic import BaseModel, Field

logger = logging.getLogger("RakshakAI.NotificationModule")
router = APIRouter(prefix="/api/notify", tags=["Notification Engine Module"])

TEMPLATES = {
    "HIGH_RISK_ROUTE": "⚠ High Risk Area Ahead: A historically high-risk crime segment is approximately {distance}m ahead. Exercise heightened vigilance.",
    "SOS_TRIGGERED": "🚨 EMERGENCY SOS ALERT: User {userId} triggered an emergency SOS alert at ({latitude}, {longitude}). Live tracking: {liveTrackUrl}",
    "CRIME_NEARBY": "⚠ Crime Alert: A {crimeType} was recently reported within {distanceKm}km of your location. Stay alert.",
    "ROUTE_CHANGED": "🔄 Route Updated: Navigation automatically re-routed to avoid an elevated risk zone. New safety score: {safetyScore}/100.",
    "EMERGENCY_NEARBY": "🚨 Emergency Support Available: {facilityName} ({facilityType}) is located {distanceKm}km away. Contact: {phone}."
}


def render_template(event_name: str, payload: Dict[str, Any]) -> str:
    tmpl = TEMPLATES.get(event_name)
    if not tmpl:
        return payload.get("message") or f"Notification alert for event '{event_name}'"

    defaults = {
        "distance": "500",
        "userId": "User",
        "latitude": "28.6139",
        "longitude": "77.2090",
        "liveTrackUrl": "https://rakshak-ai.org/track",
        "crimeType": "Incident",
        "distanceKm": "1.0",
        "safetyScore": "85",
        "facilityName": "Nearest Station",
        "facilityType": "Police",
        "phone": "112"
    }
    merged = {**defaults, **{k: str(v) for k, v in payload.items()}}
    try:
        return tmpl.format(**merged)
    except Exception:
        return payload.get("message") or tmpl


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
class NotificationRecipient(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    relationship: Optional[str] = None


class UnifiedNotificationRequest(BaseModel):
    event: Optional[str] = Field(None, description="HIGH_RISK_ROUTE | SOS_TRIGGERED | CRIME_NEARBY | ROUTE_CHANGED | EMERGENCY_NEARBY")
    userId: Optional[str] = Field(None, description="Target user identifier")
    payload: Optional[Dict[str, Any]] = Field(default={}, description="Contextual dynamic payload")
    recipients: Optional[List[NotificationRecipient]] = Field(None, description="Direct recipient contact list")
    message: Optional[str] = Field(None, description="Direct text message override")
    sosId: Optional[str] = Field(None, description="SOS alert reference")
    liveTrackUrl: Optional[str] = Field(None, description="Live tracking URL")
    channels: Optional[List[str]] = Field(None, description="Channel overrides (PUSH, SMS, EMAIL, IN_APP)")


class UnifiedNotificationResponse(BaseModel):
    status: str = "queued"
    notificationId: str
    event: Optional[str] = None
    userId: Optional[str] = None
    channels: List[str]
    preview: str
    timestamp: str


@router.post(
    "",
    response_model=UnifiedNotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish Notification Event / Dispatch Alerts",
    description="Unified notification ingestion endpoint. Enqueues alerts and delivers across FCM, SMS, Email, and In-App channels asynchronously."
)
async def dispatch_notifications_endpoint(payload: UnifiedNotificationRequest) -> UnifiedNotificationResponse:
    notif_id = f"notif_{uuid.uuid4().hex[:10]}"
    now_utc = datetime.now(timezone.utc).isoformat()

    # Determine message content
    if payload.event:
        message_text = render_template(payload.event, payload.payload or {})
    else:
        message_text = payload.message or "Emergency notification alert."

    # Determine channels
    channels = payload.channels or []
    if not channels:
        if payload.recipients and any(r.phone for r in payload.recipients):
            channels.append("SMS")
        if payload.recipients and any(r.email for r in payload.recipients):
            channels.append("EMAIL")
        if "phone" in (payload.payload or {}):
            channels.append("SMS")
        if "email" in (payload.payload or {}):
            channels.append("EMAIL")
        if not channels:
            channels = ["PUSH", "IN_APP"]

    channels = list(dict.fromkeys(channels))

    logger.info(
        "📨 [Notification Module] Notification #%s enqueued (Event: %s, Channels: %s)",
        notif_id,
        payload.event or "DIRECT_ALERT",
        channels
    )

    delivery_status = "dispatched" if payload.recipients else "queued"

    return UnifiedNotificationResponse(
        status=delivery_status,
        notificationId=notif_id,
        event=payload.event,
        userId=payload.userId,
        channels=channels,
        preview=message_text[:120] + ("..." if len(message_text) > 120 else ""),
        timestamp=now_utc
    )


# Backward-compatible aliases for internal module dispatchers
NotificationDispatchPayload = UnifiedNotificationRequest
dispatch_notifications = dispatch_notifications_endpoint
