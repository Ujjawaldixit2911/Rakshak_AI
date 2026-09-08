"""
modules_router.py
FastAPI router exposing Part 4 Advanced Safety Endpoints:
- Rakshak Safety Score (0-100)
- What-If Safety Simulator
- Last-Mile Safety Breakdown
- Natural Language Crime Search
- Family Safety Live Trip Sharing
- Police AI CSV Report Export
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules import (
    calculate_rakshak_safety_score,
    simulate_what_if,
    analyze_last_mile_safety,
    nl_crime_search,
    generate_family_safety_trip,
    export_police_crime_report
)

logger = logging.getLogger("RakshakAI.ModulesRouter")
router = APIRouter(prefix="/api/safety", tags=["safety_modules"])


class WhatIfRequest(BaseModel):
    origin: str = "Connaught Place"
    destination: str = "Saket"
    city: str = "Delhi"
    times: Optional[List[str]] = ["Evening", "Night"]
    modes: Optional[List[str]] = ["safest", "fastest"]


class LastMileRequest(BaseModel):
    origin: str = "Connaught Place"
    destination: str = "Saket"
    city: str = "Delhi"
    time_of_day: str = "Night"


class FamilyTripRequest(BaseModel):
    origin: str = "Connaught Place"
    destination: str = "Saket"
    city: str = "Delhi"
    eta_minutes: int = 25


@router.get("/rakshak-score")
async def get_rakshak_safety_score(
    lat: float = Query(28.6315),
    lon: float = Query(77.2167),
    city: str = Query("Delhi"),
    time_of_day: str = Query("Evening"),
    mode: str = Query("women_safety"),
    db: AsyncSession = Depends(get_db)
):
    """Computes unified Rakshak Safety Score (0-100) with confidence and one-line explanation."""
    return await calculate_rakshak_safety_score(
        db=db,
        lat=lat,
        lon=lon,
        city=city,
        time_of_day=time_of_day,
        mode=mode
    )


@router.post("/what-if")
async def run_what_if_simulation(
    req: WhatIfRequest,
    db: AsyncSession = Depends(get_db)
):
    """Simulates departure time & routing mode trade-offs side-by-side."""
    return await simulate_what_if(
        db=db,
        origin_name=req.origin,
        dest_name=req.destination,
        city=req.city,
        modes=req.modes or ["safest", "fastest"],
        times=req.times or ["Evening", "Night"]
    )


@router.post("/last-mile")
async def get_last_mile_analysis(
    req: LastMileRequest,
    db: AsyncSession = Depends(get_db)
):
    """Evaluates First-Mile, Transit, and Last-Mile 500m Walk segments."""
    return await analyze_last_mile_safety(
        db=db,
        origin_name=req.origin,
        dest_name=req.destination,
        city=req.city,
        time_of_day=req.time_of_day
    )


@router.get("/nl-search")
async def run_nl_crime_search(
    q: str = Query(..., description="Free text query e.g. 'theft in Karol Bagh at night'"),
    city: str = Query("Delhi"),
    db: AsyncSession = Depends(get_db)
):
    """Natural-language query parser for crime records."""
    return await nl_crime_search(
        db=db,
        query_text=q,
        city=city
    )


@router.post("/family-mode")
async def start_family_safety_mode(req: FamilyTripRequest):
    """Generates live family tracking URL, ETA countdown, and geofence status."""
    return generate_family_safety_trip(
        origin_name=req.origin,
        dest_name=req.destination,
        city=req.city,
        eta_minutes=req.eta_minutes
    )


@router.get("/export-report")
async def download_crime_report_csv(
    city: str = Query("Delhi"),
    db: AsyncSession = Depends(get_db)
):
    """Generates downloadable CSV crime intelligence report for police command."""
    csv_data = await export_police_crime_report(db=db, city=city)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rakshak_crime_report_{city.lower()}.csv"}
    )
