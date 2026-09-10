"""
eta.py
Independent ETA & Travel Time Arithmetic Module for Rakshak AI.
Standalone time arithmetic service:
- Takes duration (minutes) and reference departure time
- Computes arrival time (ETA), ISO-8601 timestamps, 12h/24h localized time formatting
- Human-readable duration strings (e.g., "1 hr 18 min", "45 min", "2 hrs 5 min")
- Zero knowledge of OSRM, GPS, maps, or database tables.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/api/eta",
    tags=["ETA Module"]
)


# ─── Pydantic Models ─────────────────────────────────────────────────────────────
class ETACalculateRequest(BaseModel):
    duration: float = Field(..., ge=0.0, description="Duration in minutes", json_schema_extra={"example": 78.0})
    departure_time: Optional[str] = Field(
        None,
        description="ISO-8601 reference departure time (defaults to server current UTC)",
        json_schema_extra={"example": "2026-09-11T01:30:00Z"}
    )
    timezone_offset_minutes: Optional[int] = Field(
        330,
        description="Client timezone offset in minutes (e.g. 330 for IST UTC+5:30)",
        json_schema_extra={"example": 330}
    )
    format_24h: Optional[bool] = Field(
        False,
        description="Whether to format ETA in 24-hour mode (e.g., '14:30') or 12-hour AM/PM mode (e.g., '02:30 PM')",
        json_schema_extra={"example": False}
    )


class ETACalculateResponse(BaseModel):
    duration_minutes: float = Field(..., description="Duration in minutes", json_schema_extra={"example": 78.0})
    formatted_duration: str = Field(..., description="Human-readable duration string", json_schema_extra={"example": "1 hr 18 min"})
    departure_time: str = Field(..., description="ISO reference departure timestamp", json_schema_extra={"example": "2026-09-11T01:30:00Z"})
    eta_iso: str = Field(..., description="ISO calculated arrival timestamp", json_schema_extra={"example": "2026-09-11T02:48:00Z"})
    eta_formatted: str = Field(..., description="Formatted arrival clock time", json_schema_extra={"example": "08:18 AM"})
    relative_eta: str = Field(..., description="Relative countdown string", json_schema_extra={"example": "in 1 hr 18 min"})


# ─── Helper Functions ────────────────────────────────────────────────────────────
def format_duration_string(minutes: float) -> str:
    total_mins = max(0, int(round(minutes)))
    if total_mins == 0:
        return "< 1 min"
    hrs = total_mins // 60
    mins = total_mins % 60

    if hrs == 0:
        return f"{mins} min"
    elif mins == 0:
        return f"{hrs} hr" if hrs == 1 else f"{hrs} hrs"
    else:
        hr_label = "hr" if hrs == 1 else "hrs"
        return f"{hrs} {hr_label} {mins} min"


def parse_departure_time(iso_str: Optional[str]) -> datetime:
    if not iso_str:
        return datetime.now(timezone.utc)
    try:
        # Handles Z and ISO offsets
        cleaned = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO-8601 departure_time format. Example: '2026-09-11T01:30:00Z'"
        )


# ─── Endpoints ───────────────────────────────────────────────────────────────────
@router.post(
    "/calculate",
    response_model=ETACalculateResponse,
    summary="Compute Estimated Arrival Time & Travel Duration",
    description="Takes a duration in minutes and reference departure timestamp to compute ETA with timezone adjustments and 12h/24h formatting."
)
async def calculate_eta(payload: ETACalculateRequest) -> ETACalculateResponse:
    if payload.duration < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration cannot be negative."
        )

    base_dt = parse_departure_time(payload.departure_time)
    duration_delta = timedelta(minutes=payload.duration)
    eta_dt = base_dt + duration_delta

    # Apply client timezone offset if provided
    tz_offset_min = payload.timezone_offset_minutes if payload.timezone_offset_minutes is not None else 0
    client_tz = timezone(timedelta(minutes=tz_offset_min))
    localized_eta = eta_dt.astimezone(client_tz)

    # Format clock string
    if payload.format_24h:
        eta_formatted = localized_eta.strftime("%H:%M")
    else:
        eta_formatted = localized_eta.strftime("%I:%M %p")

    formatted_duration = format_duration_string(payload.duration)

    return ETACalculateResponse(
        duration_minutes=round(payload.duration, 1),
        formatted_duration=formatted_duration,
        departure_time=base_dt.isoformat(),
        eta_iso=eta_dt.isoformat(),
        eta_formatted=eta_formatted,
        relative_eta=f"in {formatted_duration}"
    )
