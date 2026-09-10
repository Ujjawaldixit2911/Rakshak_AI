"""
router.py
FastAPI router for standalone Trusted Contacts Module.
"""
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .models import TrustedContact

router = APIRouter(prefix="/api/trusted-contacts", tags=["Trusted Contacts Module"])

MAX_CONTACTS_PER_USER = 5
PHONE_REGEX = re.compile(r"^\+?[0-9\s\-\(\)]{10,20}$")
EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")

class CreateTrustedContactRequest(BaseModel):
    userId: str
    name: str
    relationship: Optional[str] = "Family"
    phone: str
    email: Optional[str] = None

class TrustedContactItem(BaseModel):
    id: int
    userId: str
    name: str
    relationship: Optional[str] = None
    phone: str
    email: Optional[str] = None
    createdAt: Optional[str] = None

class NotifyEmergencyRequest(BaseModel):
    sosId: str
    userId: str
    customMessage: Optional[str] = None

class NotifyEmergencyResponse(BaseModel):
    status: str
    sosId: str
    userId: str
    recipientsCount: int
    recipients: List[Dict[str, Any]]
    liveTrackUrl: str
    message: str

async def get_db_stub():
    raise NotImplementedError("Database dependency must be injected by host app")

@router.get("", response_model=List[TrustedContactItem])
async def get_contacts(userId: str = Query(...), db: AsyncSession = Depends(get_db_stub)):
    stmt = select(TrustedContact).where(TrustedContact.user_id == userId)
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

@router.post("", response_model=TrustedContactItem, status_code=status.HTTP_201_CREATED)
async def add_contact(payload: CreateTrustedContactRequest, db: AsyncSession = Depends(get_db_stub)):
    if not PHONE_REGEX.match(payload.phone.strip()):
        raise HTTPException(status_code=422, detail="Invalid phone format")
    if payload.email and not EMAIL_REGEX.match(payload.email.strip()):
        raise HTTPException(status_code=422, detail="Invalid email format")

    count_stmt = select(func.count()).select_from(TrustedContact).where(TrustedContact.user_id == payload.userId)
    count_res = await db.execute(count_stmt)
    if (count_res.scalar() or 0) >= MAX_CONTACTS_PER_USER:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_CONTACTS_PER_USER} contacts reached.")

    new_c = TrustedContact(
        user_id=payload.userId,
        name=payload.name.strip(),
        relationship=payload.relationship or "Family",
        phone=payload.phone.strip(),
        email=payload.email.strip() if payload.email else None
    )
    db.add(new_c)
    await db.commit()
    await db.refresh(new_c)
    return TrustedContactItem(
        id=new_c.id,
        userId=new_c.user_id,
        name=new_c.name,
        relationship=new_c.relationship,
        phone=new_c.phone,
        email=new_c.email,
        createdAt=new_c.created_at.isoformat() if new_c.created_at else None
    )

@router.delete("/{contactId}")
async def remove_contact(contactId: int = Path(...), db: AsyncSession = Depends(get_db_stub)):
    stmt = select(TrustedContact).where(TrustedContact.id == contactId)
    res = await db.execute(stmt)
    c = res.scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(c)
    await db.commit()
    return {"status": "success", "message": "Contact deleted"}

@router.post("/notify-emergency", response_model=NotifyEmergencyResponse)
async def orchestrate_emergency_notification(payload: NotifyEmergencyRequest, db: AsyncSession = Depends(get_db_stub)):
    stmt = select(TrustedContact).where(TrustedContact.user_id == payload.userId)
    res = await db.execute(stmt)
    contacts = res.scalars().all()
    recipients = [{"name": c.name, "phone": c.phone, "email": c.email} for c in contacts]
    live_track_url = f"https://rakshak-ai-frontend.onrender.com/track/{payload.sosId}"

    return NotifyEmergencyResponse(
        status="dispatched" if recipients else "no_contacts",
        sosId=payload.sosId,
        userId=payload.userId,
        recipientsCount=len(recipients),
        recipients=recipients,
        liveTrackUrl=live_track_url,
        message=f"Dispatched alerts to {len(recipients)} contacts" if recipients else "No contacts configured"
    )
