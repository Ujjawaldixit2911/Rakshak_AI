"""
profile.py
User Safety Profile & Personalization Module for Rakshak AI.
Manages user preferences (travelPreference, nightTravelEnabled, womenSafetyMode, avoidHighCrimeAreas)
and computes dynamic scoring weights for downstream Safety Score calculations.
"""
from datetime import datetime
from typing import Optional, Dict, Any, Literal
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import UserSafetyProfile
from app.routers.safety_score import SafetyScoreWeights

logger = logging.getLogger("RakshakAI.ProfileModule")

router = APIRouter(
    prefix="/api/profile",
    tags=["Personalized Safety Profile Module"]
)

# ─── Configurable Night Thresholds ────────────────────────────────────────────────
NIGHT_MODE_CONFIG = {
    "day_start": 6.0,      # 06:00
    "evening_start": 19.0,  # 19:00
    "night_start": 23.0,    # 23:00
    "deep_night_end": 5.0,  # 05:00
    "elevated_night_weight": 1.25,
    "full_night_weight": 1.5,
    "full_isolation_weight": 1.35,
}


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────────
class SafetySettingsPayload(BaseModel):
    userId: str = Field(..., description="Unique User Identifier", json_schema_extra={"example": "user_101"})
    travelPreference: Literal["fastest", "safest", "balanced"] = Field("safest", description="Route prioritization mode", json_schema_extra={"example": "safest"})
    nightTravelEnabled: bool = Field(True, description="Whether user permits nighttime journeys", json_schema_extra={"example": True})
    womenSafetyMode: bool = Field(False, description="Enhanced sensitivity for women safety factors", json_schema_extra={"example": True})
    avoidHighCrimeAreas: bool = Field(True, description="Strict penalty for high-crime zones", json_schema_extra={"example": True})


class SafetySettingsResponse(BaseModel):
    userId: str
    travelPreference: str
    nightTravelEnabled: bool
    womenSafetyMode: bool
    avoidHighCrimeAreas: bool
    resolvedWeights: Dict[str, float] = Field(..., description="Active scoring weights computed for current profile & time")
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ─── Dynamic Weight Resolution Helper ─────────────────────────────────────────────
def compute_profile_weights(
    women_safety_mode: bool = False,
    avoid_high_crime: bool = True,
    night_travel_enabled: bool = True,
    travel_preference: str = "safest",
    at_time_iso: Optional[str] = None
) -> SafetyScoreWeights:
    """
    Computes dynamic scoring weights for Safety Score calculation based on user settings
    and time of day without duplicating scoring algorithms.
    """
    crime_w = 1.0
    night_w = 1.0
    iso_w = 1.0
    poi_w = 1.0
    women_mult = 1.0

    # 1. Women Safety Mode sensitivity
    if women_safety_mode:
        crime_w = max(crime_w, 1.5)
        night_w = max(night_w, 1.4)
        iso_w = max(iso_w, 1.3)
        poi_w = max(poi_w, 1.2)
        women_mult = 1.25

    # 2. Avoid High Crime Areas
    if avoid_high_crime:
        crime_w = max(crime_w, 1.3)

    # 3. Time-of-day dynamic night safety auto-detection
    current_hour = datetime.now().hour + (datetime.now().minute / 60.0)
    if at_time_iso:
        try:
            cleaned = at_time_iso.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            current_hour = dt.hour + (dt.minute / 60.0)
        except Exception:
            pass

    if (current_hour >= NIGHT_MODE_CONFIG["night_start"]) or (current_hour < NIGHT_MODE_CONFIG["deep_night_end"]):
        # Full night-safety mode (23:00 - 05:00)
        night_w = max(night_w, NIGHT_MODE_CONFIG["full_night_weight"])
        iso_w = max(iso_w, NIGHT_MODE_CONFIG["full_isolation_weight"])
        if not night_travel_enabled:
            night_w *= 1.3
    elif NIGHT_MODE_CONFIG["evening_start"] <= current_hour < NIGHT_MODE_CONFIG["night_start"]:
        # Elevated evening risk (19:00 - 23:00)
        night_w = max(night_w, NIGHT_MODE_CONFIG["elevated_night_weight"])

    # 4. Travel Preference Adjustments
    if travel_preference == "safest":
        crime_w *= 1.1
        iso_w *= 1.1
    elif travel_preference == "fastest":
        crime_w *= 0.9

    return SafetyScoreWeights(
        crimeWeight=round(crime_w, 2),
        nightRiskWeight=round(night_w, 2),
        isolationWeight=round(iso_w, 2),
        emergencyPOIWeight=round(poi_w, 2),
        womenSafetyMultiplier=round(women_mult, 2)
    )


# ─── Profile Endpoints ────────────────────────────────────────────────────────────
@router.get(
    "/safety-settings",
    response_model=SafetySettingsResponse,
    summary="Get User Safety Profile & Settings",
    description="Fetches personalized safety settings and resolves real-time scoring weights."
)
async def get_safety_settings(
    userId: str = Query(..., description="User ID to retrieve settings for"),
    atTime: Optional[str] = Query(None, description="Optional timestamp for time-specific weight preview"),
    db: AsyncSession = Depends(get_db)
) -> SafetySettingsResponse:
    q = await db.execute(select(UserSafetyProfile).where(UserSafetyProfile.user_id == userId))
    profile = q.scalars().first()

    if not profile:
        # Default baseline profile
        pref = "safest"
        night_en = True
        women_mode = False
        avoid_crime = True
        c_at = None
        u_at = None
    else:
        pref = profile.travel_preference or "safest"
        night_en = profile.night_travel_enabled if profile.night_travel_enabled is not None else True
        women_mode = bool(profile.women_safety_mode)
        avoid_crime = bool(profile.avoid_high_crime_areas)
        c_at = profile.created_at.isoformat() if profile.created_at else None
        u_at = profile.updated_at.isoformat() if profile.updated_at else None

    weights = compute_profile_weights(
        women_safety_mode=women_mode,
        avoid_high_crime=avoid_crime,
        night_travel_enabled=night_en,
        travel_preference=pref,
        at_time_iso=atTime
    )

    return SafetySettingsResponse(
        userId=userId,
        travelPreference=pref,
        nightTravelEnabled=night_en,
        womenSafetyMode=women_mode,
        avoidHighCrimeAreas=avoid_crime,
        resolvedWeights=weights.model_dump(),
        createdAt=c_at,
        updatedAt=u_at
    )


@router.put(
    "/safety-settings",
    response_model=SafetySettingsResponse,
    summary="Update or Create User Safety Settings",
    description="Upserts personalized safety settings (Women Safety Mode, Night Travel, Route Preference)."
)
async def update_safety_settings(
    payload: SafetySettingsPayload,
    db: AsyncSession = Depends(get_db)
) -> SafetySettingsResponse:
    q = await db.execute(select(UserSafetyProfile).where(UserSafetyProfile.user_id == payload.userId))
    profile = q.scalars().first()

    if not profile:
        profile = UserSafetyProfile(
            user_id=payload.userId,
            travel_preference=payload.travelPreference,
            night_travel_enabled=payload.nightTravelEnabled,
            women_safety_mode=payload.womenSafetyMode,
            avoid_high_crime_areas=payload.avoidHighCrimeAreas
        )
        db.add(profile)
    else:
        profile.travel_preference = payload.travelPreference
        profile.night_travel_enabled = payload.nightTravelEnabled
        profile.women_safety_mode = payload.womenSafetyMode
        profile.avoid_high_crime_areas = payload.avoidHighCrimeAreas

    await db.commit()
    await db.refresh(profile)

    weights = compute_profile_weights(
        women_safety_mode=profile.women_safety_mode,
        avoid_high_crime=profile.avoid_high_crime_areas,
        night_travel_enabled=profile.night_travel_enabled,
        travel_preference=profile.travel_preference
    )

    return SafetySettingsResponse(
        userId=profile.user_id,
        travelPreference=profile.travel_preference,
        nightTravelEnabled=profile.night_travel_enabled,
        womenSafetyMode=profile.women_safety_mode,
        avoidHighCrimeAreas=profile.avoid_high_crime_areas,
        resolvedWeights=weights.model_dump(),
        createdAt=profile.created_at.isoformat() if profile.created_at else None,
        updatedAt=profile.updated_at.isoformat() if profile.updated_at else None
    )


class RoleUpdatePayload(BaseModel):
    userId: str = Field(..., description="Unique User Identifier")
    role: str = Field(..., description="Selected role: citizen, corporate, emergency, police")


class RoleUpdateResponse(BaseModel):
    userId: str
    role: str
    message: str = "User role successfully updated"


@router.put(
    "/role",
    response_model=RoleUpdateResponse,
    summary="Update User Role",
    description="Persists user role selection (citizen, corporate, emergency, police) in backend profile."
)
async def update_user_role(
    payload: RoleUpdatePayload,
    db: AsyncSession = Depends(get_db)
) -> RoleUpdateResponse:
    q = await db.execute(select(UserSafetyProfile).where(UserSafetyProfile.user_id == payload.userId))
    profile = q.scalars().first()

    if not profile:
        profile = UserSafetyProfile(
            user_id=payload.userId,
            role=payload.role,
            travel_preference="safest",
            night_travel_enabled=True,
            women_safety_mode=False,
            avoid_high_crime_areas=True
        )
        db.add(profile)
    else:
        profile.role = payload.role

    await db.commit()
    await db.refresh(profile)

    return RoleUpdateResponse(
        userId=profile.user_id,
        role=profile.role,
        message="User role successfully updated and persisted across sessions"
    )

