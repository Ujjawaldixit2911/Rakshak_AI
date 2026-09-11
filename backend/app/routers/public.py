"""
public.py
Public-facing REST API routes for Crime Alert Map (Rakshak AI).
Exposes hotspot GeoJSON (DBSCAN), point-in-time safety scores, heatmap grids, and incident reporting.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import CrimeRecord, IncidentReport
from app.ml.hotspot_detector import detect_hotspots
from app.ml.safety_score_engine import calculate_safety_score, generate_safety_heatmap_grid

router = APIRouter(prefix="/api", tags=["public"])


class IncidentReportRequest(BaseModel):
    city: str = "Delhi"
    location_name: Optional[str] = "Area"
    lat: float
    lon: float
    crime_type: str = "Harassment"
    description: str
    severity: int = 5
    reporter_id: Optional[int] = 3


@router.get("/areas")
async def get_all_areas(db: AsyncSession = Depends(get_db)):
    """Returns all distinct localities/areas across Delhi and Mumbai."""
    from app.load_seed_data import DELHI_LOCALITIES, MUMBAI_LOCALITIES
    areas = []
    for name, (lat, lon) in DELHI_LOCALITIES.items():
        areas.append({"name": name, "city": "Delhi", "lat": lat, "lng": lon})
    for name, (lat, lon) in MUMBAI_LOCALITIES.items():
        areas.append({"name": name, "city": "Mumbai", "lat": lat, "lng": lon})
    return {"areas": areas}


@router.get("/crime-search")
async def search_area_crime(
    area: str = Query(..., description="Area name to search"),
    city: str = Query("Delhi", description="City name"),
    db: AsyncSession = Depends(get_db)
):
    """Returns crime breakdown, safety scores, and hotspot intelligence for a specific area."""
    from app.load_seed_data import DELHI_LOCALITIES, MUMBAI_LOCALITIES
    loc_dict = {**DELHI_LOCALITIES, **MUMBAI_LOCALITIES}
    coords = loc_dict.get(area, (28.6315, 77.2167))

    score_info = await calculate_safety_score(db, coords[0], coords[1], city=city)
    hotspots = await detect_hotspots(db, city=city)

    # Crime breakdown for this area
    q_crimes = await db.execute(
        select(CrimeRecord).where(CrimeRecord.location_name.ilike(f"%{area}%")).limit(100)
    )
    records = q_crimes.scalars().all()
    if not records:
        q_fallback = await db.execute(select(CrimeRecord).where(CrimeRecord.city == city).limit(100))
        records = q_fallback.scalars().all()

    type_counts = {}
    for r in records:
        t = r.crime_type or "Theft"
        type_counts[t] = type_counts.get(t, 0) + 1

    total = max(1, len(records))
    breakdown = [{"category": k, "count": v, "percentage": round((v / total) * 100, 1)} for k, v in type_counts.items()]

    # Hourly distribution
    hourly_counts = {h: 0 for h in [0, 4, 8, 12, 16, 20, 22]}
    for r in records:
        if r.timestamp:
            h = (r.timestamp.hour // 4) * 4
            if h in hourly_counts:
                hourly_counts[h] += 1
            else:
                hourly_counts[20] += 1
        else:
            hourly_counts[20] += 1

    peak_h = max(hourly_counts, key=hourly_counts.get)
    peak_cnt = hourly_counts[peak_h]
    max_c = max(1, max(hourly_counts.values()))
    
    hour_labels = {0: "12 AM", 4: "4 AM", 8: "8 AM", 12: "12 PM", 16: "4 PM", 20: "8 PM", 22: "10 PM"}
    hourly_data = [
        {"hour": h, "label": hour_labels.get(h, f"{h}:00"), "count": cnt, "intensity": round(cnt / max_c, 2)}
        for h, cnt in hourly_counts.items()
    ]

    # Formatted hotspots
    formatted_hotspots = []
    features = hotspots.get("features", [])
    for idx, f in enumerate(features[:5]):
        geom = f.get("geometry", {}).get("coordinates", [coords[1], coords[0]])
        props = f.get("properties", {})
        formatted_hotspots.append({
            "id": idx + 1,
            "location": props.get("cluster_name", f"{area} Hotspot {idx+1}"),
            "lat": geom[1],
            "lng": geom[0],
            "crime_count": props.get("crime_count", 15),
            "intensity": props.get("intensity", 0.75),
            "risk_level": props.get("risk_level", "Moderate"),
            "color": props.get("color", "#ef4444" if props.get("risk_level") == "High" else "#f59e0b"),
            "top_crime_types": props.get("top_crimes", ["Theft", "Snatching"]),
        })

    # Heatmap points around coordinates
    heatmap_pts = [
        {"lat": coords[0] + 0.002, "lng": coords[1] + 0.001, "intensity": 0.8},
        {"lat": coords[0] - 0.003, "lng": coords[1] - 0.002, "intensity": 0.6},
        {"lat": coords[0] + 0.005, "lng": coords[1] - 0.004, "intensity": 0.4},
    ]

    return {
        "area": area,
        "area_meta": {"lat": coords[0], "lng": coords[1]},
        "safety_score": {
            "score": score_info["safety_score"],
            "classification": score_info["risk_level"],
            "total_crimes": score_info["nearby_incidents_count"],
            "color": score_info["color"]
        },
        "crime_breakdown": breakdown,
        "peak_hours": {
            "hourly_data": hourly_data,
            "peak_window": f"{peak_h:02d}:00 - {(peak_h+3)%24:02d}:00 (High Alert)",
            "peak_hour": peak_h,
            "peak_count": peak_cnt,
        },
        "hotspots": formatted_hotspots,
        "heatmap": heatmap_pts,
        "recommendations": [
            {"icon": "💡", "tip": score_info["safety_advice"], "priority": "High"},
            {"icon": "👮", "tip": f"Active police monitoring with {score_info['factors']['nearby_police_stations']} nearby stations.", "priority": "Medium"}
        ]
    }


@router.get("/cities")
async def get_supported_cities():
    """Returns supported cities and their central coordinates."""
    return {
        "cities": [
            {
                "name": "Delhi",
                "center": [28.6139, 77.2090],
                "bounds": [[28.40, 76.80], [28.90, 77.40]],
                "zoom": 12,
                "description": "National Capital Region (NCR) Crime & Safety Zone"
            },
            {
                "name": "Mumbai",
                "center": [19.0760, 72.8777],
                "bounds": [[18.90, 72.70], [19.30, 72.98]],
                "zoom": 12,
                "description": "Greater Mumbai & Suburban Safety Zone"
            }
        ]
    }


@router.get("/hotspots")
async def get_hotspots_geojson(
    city: str = Query("Delhi", description="City name (Delhi or Mumbai)"),
    eps_km: float = Query(0.5, description="DBSCAN clustering radius in km"),
    min_samples: int = Query(5, description="DBSCAN minimum points per cluster"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns GeoJSON FeatureCollection of crime hotspot polygons and metadata computed via DBSCAN.
    """
    return await detect_hotspots(db, city=city, eps_km=eps_km, min_samples=min_samples)


@router.get("/safety-score")
async def get_area_safety_score(
    lat: float = Query(..., description="Latitude of location"),
    lon: float = Query(..., description="Longitude of location"),
    city: str = Query("Delhi", description="City name"),
    time_of_day: Optional[str] = Query(None, description="Morning, Afternoon, Evening, Night"),
    mode: str = Query("normal", description="normal, night_safety, women_safety"),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes real-time dynamic Area Safety Score (0–100 scale) for the requested coordinates.
    """
    return await calculate_safety_score(
        session=db,
        lat=lat,
        lon=lon,
        city=city,
        time_of_day=time_of_day,
        mode=mode
    )


@router.get("/safety-heatmap")
async def get_safety_heatmap(
    city: str = Query("Delhi", description="City name"),
    grid_size: int = Query(12, description="Heatmap grid resolution (e.g., 10-16)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates spatial grid heatmap data with safety score intensities for Leaflet Heat layer.
    """
    grid = await generate_safety_heatmap_grid(db, city=city, grid_size=grid_size)
    return {
        "city": city,
        "grid_points_count": len(grid),
        "heatmap": grid
    }


@router.get("/incidents")
async def get_recent_incidents(
    city: str = Query("Delhi", description="Filter by city"),
    limit: int = Query(50, description="Max incidents to return"),
    db: AsyncSession = Depends(get_db)
):
    """Returns recent crime and community incident records for map visualization."""
    query = select(CrimeRecord).where(CrimeRecord.city == city).order_by(desc(CrimeRecord.date_time)).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    incidents = [
        {
            "id": r.id,
            "city": r.city,
            "location_name": r.location_name,
            "crime_type": r.crime_type,
            "lat": r.lat,
            "lon": r.lon,
            "severity": r.severity,
            "date_time": r.date_time.isoformat() if r.date_time else None,
            "time_of_day": r.time_of_day,
            "victim_gender": r.victim_gender,
            "resolved": r.resolved,
            "cctv_count": r.cctv_count,
            "source": r.source
        }
        for r in records
    ]
    return {"city": city, "total": len(incidents), "incidents": incidents}


class SafeRouteRequest(BaseModel):
    origin: list[float]  # [lat, lon]
    destination: list[float]  # [lat, lon]
    city: str = "Delhi"
    time_of_day: str = "Evening"
    mode: str = "women_safety"  # normal, night_safety, women_safety


@router.post("/route/safe")
async def plan_safe_route(
    req: SafeRouteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Computes both 'Safest Route' and 'Fastest Route' using Modified Dijkstra on the city road graph.
    Returns full waypoint coordinates, safety score deltas, and plain-English trade-off explanation.
    """
    from app.ml.routing_engine import compute_safe_and_fast_routes
    try:
        route_plan = await compute_safe_and_fast_routes(
            session=db,
            origin_lat=req.origin[0],
            origin_lon=req.origin[1],
            dest_lat=req.destination[0],
            dest_lon=req.destination[1],
            city=req.city,
            time_of_day=req.time_of_day,
            mode=req.mode
        )
        return route_plan
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Routing calculation failed: {str(e)}")


@router.post("/incidents/report")
async def report_community_incident(
    report: IncidentReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Allows citizens to report safety incidents, automatically entering the police moderation queue."""
    new_report = IncidentReport(
        reporter_id=report.reporter_id,
        city=report.city,
        location_name=report.location_name,
        lat=report.lat,
        lon=report.lon,
        crime_type=report.crime_type,
        description=report.description,
        severity=report.severity,
        status="pending"
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)

    return {
        "status": "success",
        "message": "Incident report submitted successfully and submitted to moderation queue.",
        "report_id": new_report.id,
        "report": {
            "id": new_report.id,
            "city": new_report.city,
            "location_name": new_report.location_name,
            "lat": new_report.lat,
            "lon": new_report.lon,
            "crime_type": new_report.crime_type,
            "description": new_report.description,
            "status": new_report.status,
            "created_at": new_report.created_at.isoformat() if new_report.created_at else None
        }
    }
