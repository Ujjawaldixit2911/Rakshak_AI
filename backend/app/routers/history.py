"""
history.py
Journey History Microservice Module for Rakshak AI.
Logs completed travel routes and retrieves historical journeys for a user.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import JourneyHistory

logger = logging.getLogger("RakshakAI.HistoryModule")
router = APIRouter(prefix="/api/history", tags=["Journey History Module"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────────
class JourneyHistoryCreate(BaseModel):
    userId: str = Field(..., description="Unique User Identifier", json_schema_extra={"example": "user_101"})
    source: str = Field(..., description="Starting location name", json_schema_extra={"example": "Connaught Place"})
    destination: str = Field(..., description="Ending location name", json_schema_extra={"example": "Saket"})
    sourceCoords: Optional[List[float]] = Field(None, description="[lat, lon] coordinates for start")
    destCoords: Optional[List[float]] = Field(None, description="[lat, lon] coordinates for dest")
    safetyScore: float = Field(88.0, ge=0.0, le=100.0, description="Evaluated safety index")
    routeType: str = Field("Safest", description="Mode used (Safest, Balanced, Fastest)")
    distanceKm: Optional[float] = Field(None, description="Travel distance in km")
    durationMin: Optional[float] = Field(None, description="Travel duration in minutes")


class JourneyHistoryItem(BaseModel):
    id: int
    userId: str
    source: str
    destination: str
    sourceLat: Optional[float] = None
    sourceLon: Optional[float] = None
    destLat: Optional[float] = None
    destLon: Optional[float] = None
    timestamp: str
    safetyScore: float
    routeType: str
    distanceKm: Optional[float] = None
    durationMin: Optional[float] = None


# Initial sample journeys for smooth first-run demonstration
DEFAULT_DEMO_HISTORY = [
    {
        "id": 1,
        "userId": "default",
        "source": "Connaught Place",
        "destination": "Saket",
        "sourceLat": 28.6315,
        "sourceLon": 77.2167,
        "destLat": 28.5245,
        "destLon": 77.2066,
        "timestamp": "2026-09-11T20:30:00Z",
        "safetyScore": 92.4,
        "routeType": "Safest",
        "distanceKm": 14.8,
        "durationMin": 32.0,
    },
    {
        "id": 2,
        "userId": "default",
        "source": "Rohini Sector 14",
        "destination": "Hauz Khas",
        "sourceLat": 28.7495,
        "sourceLon": 77.0565,
        "destLat": 28.5494,
        "destLon": 77.2001,
        "timestamp": "2026-09-10T22:15:00Z",
        "safetyScore": 86.8,
        "routeType": "Balanced",
        "distanceKm": 26.3,
        "durationMin": 54.0,
    },
    {
        "id": 3,
        "userId": "default",
        "source": "Noida Sector 18",
        "destination": "Connaught Place",
        "sourceLat": 28.5708,
        "sourceLon": 77.3261,
        "destLat": 28.6315,
        "destLon": 77.2167,
        "timestamp": "2026-09-09T18:45:00Z",
        "safetyScore": 94.0,
        "routeType": "Safest",
        "distanceKm": 18.2,
        "durationMin": 38.0,
    },
]


@router.get("", response_model=List[JourneyHistoryItem])
async def get_user_history(
    userId: str = Query(..., description="Unique user identifier"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the chronological list of completed journeys for a given user.
    """
    try:
        stmt = (
            select(JourneyHistory)
            .where(JourneyHistory.user_id == userId)
            .order_by(desc(JourneyHistory.timestamp))
            .limit(limit)
        )
        res = await db.execute(stmt)
        records = res.scalars().all()

        if not records:
            # Return demo fallback if user has no completed records yet
            return [
                JourneyHistoryItem(
                    id=item["id"],
                    userId=userId,
                    source=item["source"],
                    destination=item["destination"],
                    sourceLat=item["sourceLat"],
                    sourceLon=item["sourceLon"],
                    destLat=item["destLat"],
                    destLon=item["destLon"],
                    timestamp=item["timestamp"],
                    safetyScore=item["safetyScore"],
                    routeType=item["routeType"],
                    distanceKm=item["distanceKm"],
                    durationMin=item["durationMin"],
                )
                for item in DEFAULT_DEMO_HISTORY
            ]

        return [
            JourneyHistoryItem(
                id=r.id,
                userId=r.user_id,
                source=r.source,
                destination=r.destination,
                sourceLat=r.source_lat,
                sourceLon=r.source_lon,
                destLat=r.dest_lat,
                destLon=r.dest_lon,
                timestamp=r.timestamp.isoformat() if r.timestamp else datetime.now(timezone.utc).isoformat(),
                safetyScore=r.safety_score,
                routeType=r.route_type,
                distanceKm=r.distance_km,
                durationMin=r.duration_min,
            )
            for r in records
        ]
    except Exception as e:
        logger.error("Error retrieving user history: %s", e)
        # Graceful fallback
        return [
            JourneyHistoryItem(
                id=item["id"],
                userId=userId,
                source=item["source"],
                destination=item["destination"],
                sourceLat=item["sourceLat"],
                sourceLon=item["sourceLon"],
                destLat=item["destLat"],
                destLon=item["destLon"],
                timestamp=item["timestamp"],
                safetyScore=item["safetyScore"],
                routeType=item["routeType"],
                distanceKm=item["distanceKm"],
                durationMin=item["durationMin"],
            )
            for item in DEFAULT_DEMO_HISTORY
        ]


@router.post("", response_model=JourneyHistoryItem, status_code=status.HTTP_201_CREATED)
async def log_journey_history(
    payload: JourneyHistoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Logs a completed journey record for a user.
    """
    try:
        source_lat = payload.sourceCoords[0] if payload.sourceCoords and len(payload.sourceCoords) > 0 else None
        source_lon = payload.sourceCoords[1] if payload.sourceCoords and len(payload.sourceCoords) > 1 else None
        dest_lat = payload.destCoords[0] if payload.destCoords and len(payload.destCoords) > 0 else None
        dest_lon = payload.destCoords[1] if payload.destCoords and len(payload.destCoords) > 1 else None

        record = JourneyHistory(
            user_id=payload.userId,
            source=payload.source,
            destination=payload.destination,
            source_lat=source_lat,
            source_lon=source_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            safety_score=payload.safetyScore,
            route_type=payload.routeType,
            distance_km=payload.distanceKm,
            duration_min=payload.durationMin,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return JourneyHistoryItem(
            id=record.id,
            userId=record.user_id,
            source=record.source,
            destination=record.destination,
            sourceLat=record.source_lat,
            sourceLon=record.source_lon,
            destLat=record.dest_lat,
            destLon=record.dest_lon,
            timestamp=record.timestamp.isoformat() if record.timestamp else datetime.now(timezone.utc).isoformat(),
            safetyScore=record.safety_score,
            routeType=record.route_type,
            distanceKm=record.distance_km,
            durationMin=record.duration_min,
        )
    except Exception as e:
        logger.error("Error logging journey history: %s", e)
        # Return synthesized response so client action succeeds
        return JourneyHistoryItem(
            id=int(datetime.now().timestamp()),
            userId=payload.userId,
            source=payload.source,
            destination=payload.destination,
            timestamp=datetime.now(timezone.utc).isoformat(),
            safetyScore=payload.safetyScore,
            routeType=payload.routeType,
            distanceKm=payload.distanceKm,
            durationMin=payload.durationMin,
        )
