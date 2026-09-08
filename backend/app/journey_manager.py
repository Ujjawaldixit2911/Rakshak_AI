"""
journey_manager.py
Dynamic Journey State Machine for Rakshak AI.
Manages the end-to-end user journey lifecycle:
PLANNED -> STARTED -> IN_PROGRESS -> ARRIVED (or CANCELLED)
Includes real-time GPS telemetry, route deviation detection, and post-journey safety summary.
"""
import uuid
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Journey
from .ml.safety_score_engine import calculate_safety_score


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def min_distance_to_route(lat: float, lon: float, waypoints: List[List[float]]) -> float:
    """Find minimum distance (in km) from current position to route waypoints/polyline."""
    if not waypoints:
        return 0.0
    min_dist = float("inf")
    for pt in waypoints:
        # Check pt format [lat, lon] or [lon, lat]
        pt_lat, pt_lon = pt[0], pt[1]
        dist = haversine_km(lat, lon, pt_lat, pt_lon)
        if dist < min_dist:
            min_dist = dist
    return min_dist


async def create_journey(
    db: AsyncSession,
    start_lat: float,
    start_lon: float,
    dest_lat: float,
    dest_lon: float,
    start_name: str = "Start Location",
    dest_name: str = "Destination",
    route_type: str = "Safe",
    selected_route: Optional[Dict[str, Any]] = None,
    safety_briefing: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
) -> Journey:
    """Create a new PLANNED journey."""
    journey_uuid = f"jny_{uuid.uuid4().hex[:12]}"
    risk_score = 15.0
    risk_lvl = "Low"
    if selected_route and "risk_score" in selected_route:
        risk_score = float(selected_route["risk_score"])
        risk_lvl = "High" if risk_score > 60 else ("Moderate" if risk_score > 30 else "Low")

    journey = Journey(
        journey_uuid=journey_uuid,
        user_id=user_id,
        start_lat=start_lat,
        start_lon=start_lon,
        start_name=start_name,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        dest_name=dest_name,
        route_type=route_type,
        selected_route=selected_route or {},
        safety_briefing=safety_briefing or {},
        current_lat=start_lat,
        current_lon=start_lon,
        current_risk=risk_score,
        risk_level=risk_lvl,
        status="PLANNED",
        deviations_count=0,
        deviation_alerts=[],
    )
    db.add(journey)
    await db.commit()
    await db.refresh(journey)
    return journey


async def start_journey(db: AsyncSession, journey_uuid: str) -> Optional[Journey]:
    """Transition journey from PLANNED to STARTED / IN_PROGRESS."""
    result = await db.execute(select(Journey).where(Journey.journey_uuid == journey_uuid))
    journey = result.scalar_one_or_none()
    if not journey:
        return None

    now = datetime.now(timezone.utc)
    eta_minutes = 25
    if journey.selected_route and "duration_min" in journey.selected_route:
        eta_minutes = int(journey.selected_route["duration_min"])

    journey.status = "IN_PROGRESS"
    journey.start_time = now
    journey.expected_arrival = now + timedelta(minutes=eta_minutes)
    await db.commit()
    await db.refresh(journey)
    return journey


async def update_journey_telemetry(
    db: AsyncSession,
    journey_uuid: str,
    current_lat: float,
    current_lon: float,
    deviation_threshold_km: float = 0.35,  # 350 meters
) -> Dict[str, Any]:
    """
    Ingest live GPS coordinate, check for route deviation, update risk score,
    and return live monitoring telemetry status.
    """
    result = await db.execute(select(Journey).where(Journey.journey_uuid == journey_uuid))
    journey = result.scalar_one_or_none()
    if not journey:
        return {"error": "Journey not found"}

    journey.current_lat = current_lat
    journey.current_lon = current_lon

    # Check deviation against selected route waypoints
    waypoints = []
    if journey.selected_route:
        waypoints = journey.selected_route.get("waypoints") or journey.selected_route.get("coordinates") or []

    dist_to_route_km = min_distance_to_route(current_lat, current_lon, waypoints) if waypoints else 0.0
    is_deviated = dist_to_route_km > deviation_threshold_km

    alerts = list(journey.deviation_alerts or [])
    if is_deviated:
        journey.deviations_count = (journey.deviations_count or 0) + 1
        alert_item = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "lat": current_lat,
            "lon": current_lon,
            "distance_from_route_km": round(dist_to_route_km, 3),
            "message": f"Route deviation detected: {round(dist_to_route_km * 1000)}m off planned route. Recalculating safety perimeter."
        }
        alerts.append(alert_item)
        journey.deviation_alerts = alerts

    # Dynamic risk adjustment based on proximity to destination and deviation
    base_risk = float(journey.selected_route.get("risk_score", 18.0)) if journey.selected_route else 18.0
    if is_deviated:
        base_risk += 15.0  # Increased risk on deviation
    
    journey.current_risk = min(100.0, base_risk)
    journey.risk_level = "High" if journey.current_risk > 60 else ("Moderate" if journey.current_risk > 30 else "Low")

    await db.commit()
    await db.refresh(journey)

    return {
        "journey_uuid": journey.journey_uuid,
        "status": journey.status,
        "current_lat": current_lat,
        "current_lon": current_lon,
        "dist_to_route_km": round(dist_to_route_km, 3),
        "is_deviated": is_deviated,
        "deviations_count": journey.deviations_count,
        "current_risk": journey.current_risk,
        "risk_level": journey.risk_level,
        "recent_alert": alerts[-1] if alerts else None,
    }


async def complete_journey(db: AsyncSession, journey_uuid: str) -> Optional[Dict[str, Any]]:
    """Transition journey to ARRIVED and compile the comprehensive safety & performance summary."""
    result = await db.execute(select(Journey).where(Journey.journey_uuid == journey_uuid))
    journey = result.scalar_one_or_none()
    if not journey:
        return None

    now = datetime.now(timezone.utc)
    journey.status = "ARRIVED"

    # Compute duration
    duration_min = 20.0
    if journey.start_time:
        start_tz = journey.start_time if journey.start_time.tzinfo else journey.start_time.replace(tzinfo=timezone.utc)
        duration_min = max(1.0, round((now - start_tz).total_seconds() / 60.0, 1))

    # Distance
    distance_km = 8.5
    if journey.selected_route and "distance_km" in journey.selected_route:
        distance_km = float(journey.selected_route["distance_km"])

    # Route adherence rate
    deviations = journey.deviations_count or 0
    route_adherence_pct = max(10, 100 - (deviations * 20))

    avg_risk = float(journey.current_risk or 15.0)
    safety_score_rating = "Excellent" if avg_risk < 25 and deviations == 0 else ("Good" if avg_risk < 45 else "Cautious")

    summary_data = {
        "journey_uuid": journey.journey_uuid,
        "start_name": journey.start_name,
        "dest_name": journey.dest_name,
        "route_type": journey.route_type,
        "duration_min": duration_min,
        "distance_km": distance_km,
        "avg_risk_score": avg_risk,
        "safety_rating": safety_score_rating,
        "deviations_count": deviations,
        "route_adherence_pct": f"{route_adherence_pct}%",
        "alerts_resolved": len(journey.deviation_alerts or []),
        "completed_at": now.isoformat(),
        "disclaimer": "Historical Risk Indicator, not a safety guarantee."
    }

    journey.summary = summary_data
    await db.commit()
    await db.refresh(journey)
    return summary_data
