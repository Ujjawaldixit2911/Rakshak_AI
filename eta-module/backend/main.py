from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone
from typing import Optional

app = FastAPI(title="Rakshak AI - Standalone ETA Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ETACalculateRequest(BaseModel):
    duration: float = Field(..., ge=0.0)
    departure_time: Optional[str] = None
    timezone_offset_minutes: Optional[int] = 330
    format_24h: Optional[bool] = False

class ETACalculateResponse(BaseModel):
    duration_minutes: float
    formatted_duration: str
    departure_time: str
    eta_iso: str
    eta_formatted: str
    relative_eta: str

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
        cleaned = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ISO-8601 departure_time format."
        )

@app.post("/api/eta/calculate", response_model=ETACalculateResponse)
async def calculate_eta(payload: ETACalculateRequest):
    base_dt = parse_departure_time(payload.departure_time)
    duration_delta = timedelta(minutes=payload.duration)
    eta_dt = base_dt + duration_delta

    tz_offset_min = payload.timezone_offset_minutes if payload.timezone_offset_minutes is not None else 0
    client_tz = timezone(timedelta(minutes=tz_offset_min))
    localized_eta = eta_dt.astimezone(client_tz)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
