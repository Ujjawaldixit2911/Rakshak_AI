"""
hotspot_detector.py
DBSCAN-based Crime Hotspot Detection Engine.
Uses Haversine distance metric to cluster geographic crime records into high-density zones,
generates Convex Hull / buffered polygon geometries, and computes risk indices.
"""
import math
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.cluster import DBSCAN
from shapely.geometry import MultiPoint, mapping, Point, Polygon
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import CrimeRecord

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0088

async def detect_hotspots(
    session: AsyncSession,
    city: str = "Delhi",
    eps_km: float = 0.5,
    min_samples: int = 5
) -> dict:
    """
    Performs DBSCAN clustering on crime records for a given city.
    
    1. Fetches lat/lon, severity, date_time, and crime_type from crime_records.
    2. Converts coordinates to radians for the Haversine metric.
    3. Fits DBSCAN(eps=eps_rad, min_samples=min_samples, metric='haversine').
    4. For each cluster (ignoring noise label -1):
       - Generates a convex hull boundary polygon (buffered for smooth display).
       - Computes incident count, average severity, dominant crime type, risk level.
    5. Returns a GeoJSON FeatureCollection with GeoJSON polygons and cluster properties.
    """
    # 1. Query records for the target city
    query = select(CrimeRecord).where(CrimeRecord.city == city)
    result = await session.execute(query)
    records = result.scalars().all()

    if not records or len(records) < min_samples:
        return {
            "type": "FeatureCollection",
            "city": city,
            "total_incidents": len(records),
            "total_hotspots": 0,
            "features": []
        }

    # 2. Prepare coordinate matrix and weights
    coords = []
    severities = []
    types = []
    times_of_day = []
    genders = []
    cctv_counts = []
    response_times = []

    for r in records:
        coords.append([r.lat, r.lon])
        severities.append(r.severity or 5)
        types.append(r.crime_type or "Theft")
        times_of_day.append(r.time_of_day or "Evening")
        genders.append(r.victim_gender or "Unknown")
        cctv_counts.append(r.cctv_count or 0)
        response_times.append(r.response_time_min or 15.0)

    coords_arr = np.array(coords)
    # Convert lat/lon to radians for Haversine distance
    coords_rad = np.radians(coords_arr)

    # Convert eps (km) to radians
    eps_rad = eps_km / EARTH_RADIUS_KM

    # 3. Fit DBSCAN
    # Sample weights can be proportional to severity
    db = DBSCAN(
        eps=eps_rad,
        min_samples=min_samples,
        metric="haversine",
        algorithm="ball_tree"
    )
    db.fit(coords_rad, sample_weight=np.array(severities) / 5.0)
    labels = db.labels_

    unique_labels = set(labels)
    features = []
    cluster_idx = 0

    for label in unique_labels:
        if label == -1:
            # -1 represents spatial noise / unclustered outliers in DBSCAN
            continue

        cluster_mask = (labels == label)
        cluster_coords = coords_arr[cluster_mask]
        cluster_severities = np.array(severities)[cluster_mask]
        cluster_types = pd.Series(np.array(types)[cluster_mask])
        cluster_tod = pd.Series(np.array(times_of_day)[cluster_mask])
        cluster_genders = pd.Series(np.array(genders)[cluster_mask])
        cluster_cctv = np.array(cctv_counts)[cluster_mask]
        cluster_resp = np.array(response_times)[cluster_mask]

        count = int(np.sum(cluster_mask))
        avg_sev = float(np.mean(cluster_severities))
        dominant_type = str(cluster_types.mode()[0]) if not cluster_types.empty else "Theft"
        peak_tod = str(cluster_tod.mode()[0]) if not cluster_tod.empty else "Evening"
        female_victim_pct = round(float((cluster_genders == "Female").mean() * 100), 1)
        avg_cctv = round(float(np.mean(cluster_cctv)), 1)
        avg_resp = round(float(np.mean(cluster_resp)), 1)

        # Centroid calculation
        center_lat = float(np.mean(cluster_coords[:, 0]))
        center_lon = float(np.mean(cluster_coords[:, 1]))

        # Calculate a normalized Hotspot Risk Score (0-100)
        # Higher count & severity increases risk; high CCTV and fast response decreases risk
        raw_risk = (count * 1.8) + (avg_sev * 6.5) - (avg_cctv * 1.2) + (avg_resp * 0.4)
        risk_score = round(min(100.0, max(15.0, raw_risk)), 1)

        if risk_score >= 65:
            risk_category = "High Severity Hotspot"
            color = "#ef4444"  # Red
        elif risk_score >= 40:
            risk_category = "Moderate Risk Zone"
            color = "#f59e0b"  # Amber
        else:
            risk_category = "Low Caution Area"
            color = "#3b82f6"  # Blue

        # 4. Generate geometry: Convex Hull buffered for visual map overlay
        points = [Point(lon, lat) for lat, lon in cluster_coords]
        if len(points) >= 3:
            try:
                poly = MultiPoint(points).convex_hull.buffer(0.003)
            except Exception:
                poly = Point(center_lon, center_lat).buffer(0.005)
        else:
            poly = Point(center_lon, center_lat).buffer(0.005)

        geo_feature = {
            "type": "Feature",
            "id": f"hotspot-{city.lower()}-{cluster_idx + 1}",
            "geometry": mapping(poly),
            "properties": {
                "cluster_id": cluster_idx + 1,
                "city": city,
                "center": [center_lat, center_lon],
                "incident_count": count,
                "avg_severity": round(avg_sev, 2),
                "risk_score": risk_score,
                "risk_category": risk_category,
                "color": color,
                "dominant_crime_type": dominant_type,
                "peak_time_of_day": peak_tod,
                "female_victim_percentage": female_victim_pct,
                "avg_cctv_coverage": avg_cctv,
                "avg_police_response_time_min": avg_resp,
                "radius_meters": round(eps_km * 1000),
            }
        }
        features.append(geo_feature)
        cluster_idx += 1

    # Sort hotspots descending by risk score
    features.sort(key=lambda x: x["properties"]["risk_score"], reverse=True)

    return {
        "type": "FeatureCollection",
        "city": city,
        "total_incidents": len(records),
        "total_hotspots": len(features),
        "noise_points": int(np.sum(labels == -1)),
        "features": features
    }
