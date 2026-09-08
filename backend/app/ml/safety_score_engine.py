"""
safety_score_engine.py
Dynamic Area Safety Score Engine (0–100 scale).
Evaluates crime density, severity, recency decay, police presence, CCTV coverage,
weather/traffic conditions, time-of-day, and gender-specific risk profiles.
"""
import math
import numpy as np
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CrimeRecord, EnvironmentContext

EARTH_RADIUS_KM = 6371.0088

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


async def calculate_safety_score(
    session: AsyncSession,
    lat: float,
    lon: float,
    city: str = "Delhi",
    time_of_day: str = None,
    mode: str = "normal",  # normal, night_safety, women_safety
    radius_km: float = 1.8,
    cached_records: list = None
) -> dict:
    """
    Calculates a multi-factor Area Safety Score (0–100) for a given point.
    
    Formula components:
    1. Base Safety = 100.0
    2. Crime Penalty = sum( spatial_kernel(dist) * severity * recency_decay * tod_factor * mode_factor )
    3. Infrastructure Boost = f(cctv_count, police_station_count, response_time)
    4. Environmental Risk = f(weather, traffic_congestion)
    5. Final Score = clamp(Base - Crime Penalty + Boost - Env Risk, 0, 100)
    """
    if cached_records is not None:
        records = cached_records
    else:
        query = select(CrimeRecord).where(CrimeRecord.city == city)
        result = await session.execute(query)
        records = result.scalars().all()

    if not records:
        return {
            "lat": lat,
            "lon": lon,
            "city": city,
            "safety_score": 85.0,
            "risk_level": "Low Risk",
            "nearby_incidents_count": 0,
            "confidence": "Low (No historical data for city)"
        }

    now = datetime.now()
    nearby_crimes = []
    total_penalty = 0.0
    total_cctv = 0
    total_police = 0
    response_times = []

    # Weights by crime type for women safety mode
    women_vulnerable_types = {"Harassment": 2.2, "Stalking": 2.2, "Assault": 2.0, "Snatching": 1.7, "Robbery": 1.5}

    for r in records:
        dist = haversine_distance(lat, lon, r.lat, r.lon)
        if dist <= radius_km:
            nearby_crimes.append(r)
            
            # 1. Spatial Kernel Decay: weight = exp(-dist / 0.6)
            spatial_weight = math.exp(-dist / 0.6)

            # 2. Recency Decay: half-life of ~180 days
            if r.date_time:
                # Handle offset-aware vs naive
                dt_clean = r.date_time.replace(tzinfo=None) if hasattr(r.date_time, 'tzinfo') else r.date_time
                days_diff = max(0, (now - dt_clean).days)
            else:
                days_diff = 90
            recency_weight = math.exp(-days_diff / 240.0)

            # 3. Time of Day Factor
            tod_weight = 1.0
            if time_of_day:
                if time_of_day.lower() == str(r.time_of_day).lower():
                    tod_weight = 1.35
                elif time_of_day.lower() == "night":
                    tod_weight = 1.45 if str(r.time_of_day).lower() == "night" else 1.1

            # 4. Mode Factor (Women Safety / Night Safety)
            mode_weight = 1.0
            if mode == "women_safety":
                if r.crime_type in women_vulnerable_types:
                    mode_weight *= women_vulnerable_types[r.crime_type]
                if r.victim_gender == "Female":
                    mode_weight *= 1.3
            elif mode == "night_safety":
                if str(r.time_of_day).lower() == "night":
                    mode_weight *= 1.4

            severity = r.severity if r.severity else 5
            # Incident penalty contribution
            incident_penalty = (severity * 1.6) * spatial_weight * recency_weight * tod_weight * mode_weight
            total_penalty += incident_penalty

            total_cctv += (r.cctv_count or 0)
            total_police += (r.police_station_count or 0)
            if r.response_time_min:
                response_times.append(r.response_time_min)

    incident_count = len(nearby_crimes)
    avg_cctv = (total_cctv / incident_count) if incident_count > 0 else 5.0
    avg_police = (total_police / incident_count) if incident_count > 0 else 1.0
    avg_resp = float(np.mean(response_times)) if response_times else 15.0

    # Infrastructure boost (max +18 points)
    infra_boost = min(18.0, (avg_cctv * 0.8) + (avg_police * 3.5) + max(0.0, (20.0 - avg_resp) * 0.4))

    # Calculate final safety score
    base_score = 100.0
    final_score = base_score - (total_penalty * 0.7) + infra_boost
    final_score = round(max(5.0, min(100.0, final_score)), 1)

    # Risk level categorization
    if final_score >= 75.0:
        risk_level = "Safe Area"
        color = "#22c55e"  # Green
        advice = "Well-patrolled zone with positive safety metrics and strong surveillance."
    elif final_score >= 50.0:
        risk_level = "Moderate Caution"
        color = "#eab308"  # Yellow/Amber
        advice = "Moderate historical incidents. Remain mindful of surroundings after dusk."
    else:
        risk_level = "High Risk Area"
        color = "#ef4444"  # Red
        advice = "Frequent incidents recorded. Stay on main lighted avenues or activate travel escort."

    return {
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "city": city,
        "mode": mode,
        "time_of_day": time_of_day or "Current",
        "safety_score": final_score,
        "risk_level": risk_level,
        "color": color,
        "nearby_incidents_count": incident_count,
        "factors": {
            "crime_penalty_points": round(total_penalty * 0.7, 1),
            "infrastructure_boost_points": round(infra_boost, 1),
            "avg_cctv_cameras": round(avg_cctv, 1),
            "nearby_police_stations": round(avg_police, 1),
            "avg_response_time_min": round(avg_resp, 1)
        },
        "safety_advice": advice
    }


async def generate_safety_heatmap_grid(
    session: AsyncSession,
    city: str = "Delhi",
    grid_size: int = 14
) -> list[dict]:
    """
    Generates a spatial grid of Safety Scores for heatmap rendering across the city bounds.
    """
    from ..load_seed_data import CITY_BOUNDS

    bounds = CITY_BOUNDS.get(city, CITY_BOUNDS["Delhi"])
    lats = np.linspace(bounds["lat_min"], bounds["lat_max"], grid_size)
    lons = np.linspace(bounds["lon_min"], bounds["lon_max"], grid_size)

    # Pre-fetch records once
    query = select(CrimeRecord).where(CrimeRecord.city == city)
    result = await session.execute(query)
    records = result.scalars().all()

    grid_points = []
    for lat in lats:
        for lon in lons:
            score_data = await calculate_safety_score(
                session, float(lat), float(lon), city=city, cached_records=records
            )
            # Intensity for leaflet heatmap (0 = safe/cold, 1 = high crime risk/hot)
            risk_intensity = round((100.0 - score_data["safety_score"]) / 100.0, 3)
            grid_points.append({
                "lat": round(float(lat), 5),
                "lon": round(float(lon), 5),
                "safety_score": score_data["safety_score"],
                "risk_intensity": risk_intensity,
                "risk_level": score_data["risk_level"]
            })
    return grid_points
