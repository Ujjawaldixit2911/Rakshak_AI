"""
crimes.py
Independent Crime Data Module for Rakshak AI.
Core intelligence layer owning crime records and exposing them via REST API only:
- GET /api/crimes (filtering by crimeType, severity, date range, pagination)
- GET /api/crimes/nearby (geospatial radius query ST_DWithin / Haversine, sorted by distance asc)
- POST /api/crimes (persisting new crime incident record)
- Zero knowledge of Route, ETA, or Geocoding logic.
"""

import math
from datetime import date as dt_date, time as dt_time, datetime, timezone
from typing import Optional, List, Literal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from ..database import get_db
from ..models import CrimeRecord

router = APIRouter(
    prefix="/api/crimes",
    tags=["Crime Data Module"]
)


# ─── Pydantic Request & Response Models ───────────────────────────────────────────
SeverityType = Literal["low", "medium", "high"]


class CrimeItem(BaseModel):
    id: int
    crimeType: str = Field(..., description="Type of crime", json_schema_extra={"example": "Theft"})
    latitude: float = Field(..., description="Latitude coordinate", json_schema_extra={"example": 28.62})
    longitude: float = Field(..., description="Longitude coordinate", json_schema_extra={"example": 77.21})
    date: str = Field(..., description="Date of incident (YYYY-MM-DD)", json_schema_extra={"example": "2026-09-11"})
    time: Optional[str] = Field(None, description="Time of incident (HH:MM:SS)", json_schema_extra={"example": "14:30:00"})
    severity: SeverityType = Field(..., description="Severity level: low, medium, or high", json_schema_extra={"example": "high"})
    location: str = Field(..., description="Human-readable location name", json_schema_extra={"example": "Sector 18, Noida"})
    source: str = Field("Delhi Police Open Data", description="Data source attribution", json_schema_extra={"example": "Delhi Police Open Data"})


class NearbyCrimeItem(CrimeItem):
    distanceKm: float = Field(..., description="Distance in kilometers from query coordinate", json_schema_extra={"example": 0.8})


class PaginatedCrimesResponse(BaseModel):
    total: int = Field(..., description="Total matching crime records count", json_schema_extra={"example": 142})
    page: int = Field(..., description="Current page number (1-indexed)", json_schema_extra={"example": 1})
    results: List[CrimeItem] = Field(..., description="List of crime record objects")


class CreateCrimeRequest(BaseModel):
    crimeType: str = Field(..., min_length=2, description="Type of crime (e.g. Theft, Harassment, Robbery)", json_schema_extra={"example": "Theft"})
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude", json_schema_extra={"example": 28.62})
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude", json_schema_extra={"example": 77.21})
    date: Optional[str] = Field(None, description="Date (YYYY-MM-DD)", json_schema_extra={"example": "2026-09-11"})
    time: Optional[str] = Field(None, description="Time (HH:MM:SS)", json_schema_extra={"example": "14:30:00"})
    severity: SeverityType = Field("medium", description="Severity level", json_schema_extra={"example": "medium"})
    location: str = Field(..., min_length=2, description="Location description / landmark", json_schema_extra={"example": "Sector 18, Noida"})
    source: Optional[str] = Field("user_report", description="Data origin", json_schema_extra={"example": "user_report"})


# ─── Helper Converters ───────────────────────────────────────────────────────────
def severity_num_to_enum(val: int) -> SeverityType:
    if val >= 8:
        return "high"
    elif val >= 4:
        return "medium"
    return "low"


def severity_enum_to_num(val: SeverityType) -> int:
    if val == "high":
        return 9
    elif val == "medium":
        return 5
    return 2


def severity_filter_clause(severity_enum: SeverityType):
    if severity_enum == "high":
        return CrimeRecord.severity >= 8
    elif severity_enum == "medium":
        return and_(CrimeRecord.severity >= 4, CrimeRecord.severity <= 7)
    elif severity_enum == "low":
        return CrimeRecord.severity <= 3
    return None


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance in km between two coordinate pairs."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def record_to_crime_item(rec: CrimeRecord) -> CrimeItem:
    rec_date = rec.date_time.strftime("%Y-%m-%d") if rec.date_time else "2026-01-01"
    rec_time = rec.date_time.strftime("%H:%M:%S") if rec.date_time else "12:00:00"
    return CrimeItem(
        id=rec.id,
        crimeType=rec.crime_type,
        latitude=rec.lat,
        longitude=rec.lon,
        date=rec_date,
        time=rec_time,
        severity=severity_num_to_enum(rec.severity or 5),
        location=rec.location_name or rec.city or "Unknown",
        source=rec.source or "Delhi Police Open Data"
    )


# ─── REST Endpoints ──────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=PaginatedCrimesResponse,
    summary="Query Crime Records",
    description="Retrieves paginated crime records filtered by crime type, severity, and date range."
)
async def get_crimes(
    crimeType: Optional[str] = Query(None, description="Filter by crime type (e.g. Theft, Assault)"),
    severity: Optional[SeverityType] = Query(None, description="Filter by severity (low, medium, high)"),
    from_date: Optional[str] = Query(None, alias="from", description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, alias="to", description="To date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedCrimesResponse:
    conditions = []

    if crimeType:
        conditions.append(func.lower(CrimeRecord.crime_type).contains(crimeType.strip().lower()))

    if severity:
        sev_clause = severity_filter_clause(severity)
        if sev_clause is not None:
            conditions.append(sev_clause)

    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date.strip())
            conditions.append(CrimeRecord.date_time >= dt_from)
        except Exception:
            pass

    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date.strip())
            conditions.append(CrimeRecord.date_time <= dt_to)
        except Exception:
            pass

    # Count total matching query
    count_stmt = select(func.count(CrimeRecord.id))
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Query page items
    stmt = select(CrimeRecord)
    if conditions:
        stmt = stmt.where(and_(*conditions))
    stmt = stmt.order_by(CrimeRecord.date_time.desc().nullslast(), CrimeRecord.id.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)

    results_res = await db.execute(stmt)
    records = results_res.scalars().all()

    items = [record_to_crime_item(r) for r in records]

    return PaginatedCrimesResponse(
        total=total_count,
        page=page,
        results=items
    )


@router.get(
    "/nearby",
    response_model=List[NearbyCrimeItem],
    summary="Find Nearby Crimes (Geospatial Radius Search)",
    description="Returns crime incidents within radiusKm from target coordinates, sorted by distance ascending."
)
async def get_nearby_crimes(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude center point"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude center point"),
    radiusKm: float = Query(5.0, gt=0.0, le=100.0, description="Radius in kilometers"),
    severity: Optional[SeverityType] = Query(None, description="Optional severity filter (low, medium, high)"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
) -> List[NearbyCrimeItem]:
    # Bounding box pre-filter for database index acceleration (1 deg lat ~ 111 km)
    delta_lat = radiusKm / 110.0
    delta_lon = radiusKm / (110.0 * max(0.1, math.cos(math.radians(lat))))

    conditions = [
        CrimeRecord.lat >= lat - delta_lat,
        CrimeRecord.lat <= lat + delta_lat,
        CrimeRecord.lon >= lng - delta_lon,
        CrimeRecord.lon <= lng + delta_lon,
    ]

    if severity:
        sev_clause = severity_filter_clause(severity)
        if sev_clause is not None:
            conditions.append(sev_clause)

    stmt = select(CrimeRecord).where(and_(*conditions))
    res = await db.execute(stmt)
    candidates = res.scalars().all()

    nearby_items: List[NearbyCrimeItem] = []
    for rec in candidates:
        dist = calculate_haversine_distance_km(lat, lng, rec.lat, rec.lon)
        if dist <= radiusKm:
            rec_date = rec.date_time.strftime("%Y-%m-%d") if rec.date_time else "2026-01-01"
            rec_time = rec.date_time.strftime("%H:%M:%S") if rec.date_time else "12:00:00"
            nearby_items.append(
                NearbyCrimeItem(
                    id=rec.id,
                    crimeType=rec.crime_type,
                    latitude=rec.lat,
                    longitude=rec.lon,
                    date=rec_date,
                    time=rec_time,
                    severity=severity_num_to_enum(rec.severity or 5),
                    location=rec.location_name or rec.city or "Unknown",
                    source=rec.source or "Delhi Police Open Data",
                    distanceKm=round(dist, 2)
                )
            )

    # Sort strictly by distance ascending
    nearby_items.sort(key=lambda x: x.distanceKm)
    return nearby_items[:limit]


@router.post(
    "",
    response_model=CrimeItem,
    status_code=status.HTTP_201_CREATED,
    summary="Record New Crime Incident",
    description="Stores a new crime incident record with geospatial coordinates, date/time, and severity."
)
async def create_crime_record(
    payload: CreateCrimeRequest,
    db: AsyncSession = Depends(get_db)
) -> CrimeItem:
    # Parse date and time
    now = datetime.now(timezone.utc)
    if payload.date:
        try:
            d_part = dt_date.fromisoformat(payload.date.strip())
        except Exception:
            d_part = now.date()
    else:
        d_part = now.date()

    if payload.time:
        try:
            t_part = dt_time.fromisoformat(payload.time.strip())
        except Exception:
            t_part = now.time()
    else:
        t_part = now.time()

    record_dt = datetime.combine(d_part, t_part).replace(tzinfo=timezone.utc)

    # Determine city heuristic from location or fallback to Delhi
    city = "Delhi"
    loc_lower = payload.location.lower()
    if "noida" in loc_lower or "ghaziabad" in loc_lower or "up" in loc_lower:
        city = "Noida"
    elif "mumbai" in loc_lower or "thane" in loc_lower:
        city = "Mumbai"
    elif "gurugram" in loc_lower or "gurgaon" in loc_lower or "haryana" in loc_lower:
        city = "Gurugram"

    # Time of day tag
    hour = record_dt.hour
    if 5 <= hour < 12:
        time_of_day = "Morning"
    elif 12 <= hour < 17:
        time_of_day = "Afternoon"
    elif 17 <= hour < 21:
        time_of_day = "Evening"
    else:
        time_of_day = "Night"

    new_record = CrimeRecord(
        city=city,
        location_name=payload.location.strip(),
        date_time=record_dt,
        crime_type=payload.crimeType.strip(),
        lat=payload.latitude,
        lon=payload.longitude,
        severity=severity_enum_to_num(payload.severity),
        time_of_day=time_of_day,
        source=payload.source or "user_report",
        resolved=False,
        arrested=False,
    )

    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)

    return record_to_crime_item(new_record)
