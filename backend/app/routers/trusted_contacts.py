"""
trusted_contacts.py
Independent Trusted Contacts Module for Rakshak AI.
Manages a user's emergency contact list and orchestrates emergency notifications.
Decoupled: Decides WHO to notify, builds the tracking link payload, and calls Notification Module API.
"""
import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.models import TrustedContact

logger = logging.getLogger("RakshakAI.TrustedContacts")
router = APIRouter(prefix="/api/trusted-contacts", tags=["Trusted Contacts Module"])

MAX_CONTACTS_PER_USER = 5
PHONE_REGEX = re.compile(r"^\+?[0-9\s\-\(\)]{10,20}$")
EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class CreateTrustedContactRequest(BaseModel):
    userId: str = Field(..., min_length=1, description="Unique user identifier", json_schema_extra={"example": "user_123"})
    name: str = Field(..., min_length=2, max_length=100, description="Contact full name", json_schema_extra={"example": "Rahul Sharma"})
    relationship: Optional[str] = Field("Family", description="Relationship (Parent, Sibling, Spouse, Friend, Guardian)", json_schema_extra={"example": "Parent"})
    phone: str = Field(..., description="Mobile phone number with country code", json_schema_extra={"example": "+91-9876543210"})
    email: Optional[str] = Field(None, description="Email address", json_schema_extra={"example": "rahul.parent@example.com"})


class TrustedContactItem(BaseModel):
    id: int
    userId: str
    name: str
    relationship: Optional[str] = None
    phone: str
    email: Optional[str] = None
    createdAt: Optional[str] = None


class NotifyEmergencyRequest(BaseModel):
    sosId: str = Field(..., description="ID of the active SOS event to broadcast", json_schema_extra={"example": "1"})
    userId: str = Field(..., description="ID of the user who triggered the emergency", json_schema_extra={"example": "user_123"})
    customMessage: Optional[str] = Field(None, description="Optional custom distress note")


class NotifyEmergencyResponse(BaseModel):
    status: str
    sosId: str
    userId: str
    recipientsCount: int
    recipients: List[Dict[str, Any]]
    liveTrackUrl: str
    notificationDispatch: Dict[str, Any]
    message: str


# ─── Helper Validators ────────────────────────────────────────────────────────
def validate_contact_payload(phone: str, email: Optional[str]):
    clean_phone = phone.strip()
    if not PHONE_REGEX.match(clean_phone):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid phone number format. Please provide at least 10 valid digits."
        )
    if email and email.strip():
        if not EMAIL_REGEX.match(email.strip()):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email address format."
            )


# ─── CRUD REST Endpoints ──────────────────────────────────────────────────────
@router.get(
    "",
    response_model=List[TrustedContactItem],
    summary="Get User's Trusted Contacts",
    description="Retrieves all registered emergency contacts for the specified user ID."
)
async def get_trusted_contacts(
    userId: str = Query(..., min_length=1, description="User ID to fetch contacts for"),
    db: AsyncSession = Depends(get_db)
) -> List[TrustedContactItem]:
    stmt = select(TrustedContact).where(TrustedContact.user_id == userId).order_by(TrustedContact.created_at.asc())
    res = await db.execute(stmt)
    contacts = res.scalars().all()

    return [
        TrustedContactItem(
            id=c.id,
            userId=c.user_id,
            name=c.name,
            relationship=c.relationship,
            phone=c.phone,
            email=c.email,
            createdAt=c.created_at.isoformat() if c.created_at else None
        )
        for c in contacts
    ]


@router.post(
    "",
    response_model=TrustedContactItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add New Trusted Contact",
    description="Adds an emergency contact for the user. Validates phone/email and enforces a maximum cap of 5 contacts."
)
async def create_trusted_contact(
    payload: CreateTrustedContactRequest,
    db: AsyncSession = Depends(get_db)
) -> TrustedContactItem:
    # 1. Format validation
    validate_contact_payload(payload.phone, payload.email)

    # 2. Check maximum contacts cap per user
    count_stmt = select(func.count()).select_from(TrustedContact).where(TrustedContact.user_id == payload.userId)
    count_res = await db.execute(count_stmt)
    current_count = count_res.scalar() or 0

    if current_count >= MAX_CONTACTS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User already has the maximum allowed {MAX_CONTACTS_PER_USER} emergency contacts."
        )

    # 3. Insert record
    new_contact = TrustedContact(
        user_id=payload.userId,
        name=payload.name.strip(),
        relationship=payload.relationship.strip() if payload.relationship else "Family",
        phone=payload.phone.strip(),
        email=payload.email.strip() if payload.email else None
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)

    logger.info("🛡️ [TrustedContacts] Added contact '%s' for user %s (%d/%d)", new_contact.name, payload.userId, current_count + 1, MAX_CONTACTS_PER_USER)

    return TrustedContactItem(
        id=new_contact.id,
        userId=new_contact.user_id,
        name=new_contact.name,
        relationship=new_contact.relationship,
        phone=new_contact.phone,
        email=new_contact.email,
        createdAt=new_contact.created_at.isoformat() if new_contact.created_at else None
    )


@router.delete(
    "/{contactId}",
    summary="Delete Trusted Contact",
    description="Deletes an emergency contact record by ID."
)
async def delete_trusted_contact(
    contactId: int = Path(..., description="ID of the contact to delete"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TrustedContact).where(TrustedContact.id == contactId)
    res = await db.execute(stmt)
    contact = res.scalars().first()

    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trusted contact #{contactId} not found.")

    await db.delete(contact)
    await db.commit()
    logger.info("🗑️ [TrustedContacts] Deleted contact #%d for user %s", contactId, contact.user_id)

    return {
        "status": "success",
        "message": f"Trusted contact #{contactId} deleted successfully."
    }


# ─── Emergency Orchestrator ───────────────────────────────────────────────────
@router.post(
    "/notify-emergency",
    response_model=NotifyEmergencyResponse,
    summary="Orchestrate Emergency Notifications to Contacts",
    description="Fetches user's contacts, generates live-location tracking link (/track/{sosId}), and delegates dispatch to Notification Module API."
)
async def notify_emergency_contacts(
    payload: NotifyEmergencyRequest,
    db: AsyncSession = Depends(get_db)
) -> NotifyEmergencyResponse:
    # 1. Fetch user's registered contacts (who to notify)
    stmt = select(TrustedContact).where(TrustedContact.user_id == payload.userId)
    res = await db.execute(stmt)
    contacts = res.scalars().all()

    recipients_list = [
        {
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "relationship": c.relationship
        }
        for c in contacts
    ]

    # Generate live tracking URL
    live_track_url = f"https://rakshak-ai-frontend.onrender.com/track/{payload.sosId}"
    alert_message = (
        payload.customMessage
        or f"🚨 EMERGENCY ALERT: User {payload.userId} has triggered an SOS on Rakshak AI. Track live location in real-time here: {live_track_url}"
    )

    if not recipients_list:
        logger.warning("No trusted contacts configured for user %s on SOS #%s", payload.userId, payload.sosId)
        return NotifyEmergencyResponse(
            status="no_contacts",
            sosId=payload.sosId,
            userId=payload.userId,
            recipientsCount=0,
            recipients=[],
            liveTrackUrl=live_track_url,
            notificationDispatch={"status": "skipped", "reason": "No registered contacts"},
            message="No emergency contacts configured for this user."
        )

    # 2. Delegate dispatch to Notification Module (how to notify) via REST API
    notification_payload = {
        "recipients": recipients_list,
        "message": alert_message,
        "sosId": payload.sosId,
        "liveTrackUrl": live_track_url,
        "priority": "HIGH"
    }

    # Call internal router function or simulated endpoint
    from app.routers.notifications import dispatch_notifications, NotificationDispatchPayload
    try:
        dispatch_res = await dispatch_notifications(NotificationDispatchPayload(**notification_payload))
        dispatch_dict = dispatch_res.model_dump() if hasattr(dispatch_res, "model_dump") else dispatch_res.dict()
    except Exception as e:
        logger.error("Failed to dispatch via Notification Module API: %s", e)
        dispatch_dict = {"status": "error", "error": str(e)}

    return NotifyEmergencyResponse(
        status="dispatched",
        sosId=payload.sosId,
        userId=payload.userId,
        recipientsCount=len(recipients_list),
        recipients=recipients_list,
        liveTrackUrl=live_track_url,
        notificationDispatch=dispatch_dict,
        message=f"Successfully queued emergency alerts to {len(recipients_list)} trusted contact(s)."
    )
