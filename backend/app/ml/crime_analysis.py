"""
crime_analysis.py — Core crime analytics ML module
Implements: Safety Score, Crime Type Breakdown, Peak Hours,
            DBSCAN Hotspot Detection, Heatmap Data generation
"""
import math
import random
from collections import Counter, defaultdict
from typing import Any
from datetime import datetime

import numpy as np
from sklearn.cluster import DBSCAN


# ──────────────────────────────────────────────────────────────────────────────
# Area registry — Lucknow areas with centroids
# ──────────────────────────────────────────────────────────────────────────────
LUCKNOW_AREAS: dict[str, dict] = {
    "Gomti Nagar":      {"lat": 26.8469, "lng": 81.0093, "pop_density": 0.85},
    "Hazratganj":       {"lat": 26.8505, "lng": 80.9491, "pop_density": 0.95},
    "Sector 62":        {"lat": 26.8600, "lng": 80.9760, "pop_density": 0.70},
    "Alambagh":         {"lat": 26.8094, "lng": 80.9115, "pop_density": 0.80},
    "Charbagh":         {"lat": 26.8375, "lng": 80.9177, "pop_density": 0.90},
    "Indira Nagar":     {"lat": 26.8731, "lng": 81.0004, "pop_density": 0.75},
    "Aliganj":          {"lat": 26.8818, "lng": 80.9662, "pop_density": 0.65},
    "Mahanagar":        {"lat": 26.8710, "lng": 80.9552, "pop_density": 0.70},
    "Vikas Nagar":      {"lat": 26.8200, "lng": 80.9750, "pop_density": 0.60},
    "Chinhat":          {"lat": 26.8600, "lng": 81.0500, "pop_density": 0.55},
    "Rajajipuram":      {"lat": 26.8300, "lng": 80.9100, "pop_density": 0.72},
    "Hussainganj":      {"lat": 26.8527, "lng": 80.9392, "pop_density": 0.88},
    "Aminabad":         {"lat": 26.8423, "lng": 80.9296, "pop_density": 0.92},
    "Telibagh":         {"lat": 26.7908, "lng": 80.9503, "pop_density": 0.58},
    "Jankipuram":       {"lat": 26.9000, "lng": 80.9700, "pop_density": 0.62},
}

CRIME_CATEGORIES = ["Snatching", "Robbery", "Pickpocketing", "Theft", "Assault", "Vandalism", "Other"]

SEVERITY_WEIGHTS = {
    "Snatching":    7,
    "Robbery":      9,
    "Pickpocketing": 3,
    "Theft":        4,
    "Assault":      8,
    "Vandalism":    2,
    "Other":        3,
}


# ──────────────────────────────────────────────────────────────────────────────
# Safety Score
# ──────────────────────────────────────────────────────────────────────────────
def compute_safety_score(incidents: list[dict]) -> dict[str, Any]:
    """
    Score = 100 − penalty.
    Penalty accounts for: crime frequency, weighted severity, recency bias.
    """
    if not incidents:
        return {
            "score": 95,
            "classification": "Safe",
            "total_crimes": 0,
            "color": "green",
        }

    now = datetime.utcnow()
    penalty = 0.0

    for inc in incidents:
        sev = inc.get("severity", 5)
        # Recency multiplier: crimes in last 30 days count 3×, last 90 days 2×
        try:
            reported = inc.get("reported_at")
            if isinstance(reported, str):
                reported = datetime.fromisoformat(reported.replace("Z", "+00:00"))
            if reported and reported.tzinfo:
                reported = reported.replace(tzinfo=None)
            days_ago = max(0, (now - reported).days) if reported else 180
        except Exception:
            days_ago = 180

        if days_ago <= 30:
            recency = 3.0
        elif days_ago <= 90:
            recency = 2.0
        elif days_ago <= 180:
            recency = 1.2
        else:
            recency = 0.5

        crime_type = inc.get("crime_type", "Other")
        type_weight = SEVERITY_WEIGHTS.get(crime_type, 3)
        penalty += (sev / 10) * type_weight * recency

    # Normalize: cap penalty at 200 → maps to score 0
    normalized_penalty = min(penalty / 200, 1.0) * 100
    score = max(0, 100 - normalized_penalty)
    score = round(score, 1)

    if score >= 70:
        classification = "Safe"
        color = "#22c55e"
    elif score >= 45:
        classification = "Moderate"
        color = "#f59e0b"
    else:
        classification = "High Alert"
        color = "#ef4444"

    return {
        "score": score,
        "classification": classification,
        "total_crimes": len(incidents),
        "color": color,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Crime Type Breakdown
# ──────────────────────────────────────────────────────────────────────────────
def crime_type_breakdown(incidents: list[dict]) -> list[dict]:
    total = len(incidents) or 1
    counts: Counter = Counter(inc.get("crime_type", "Other") for inc in incidents)

    result = []
    for cat in CRIME_CATEGORIES:
        c = counts.get(cat, 0)
        result.append({
            "category": cat,
            "count": c,
            "percentage": round(c / total * 100, 1),
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Peak Crime Hours
# ──────────────────────────────────────────────────────────────────────────────
HOUR_LABELS = [
    "12AM", "1AM", "2AM", "3AM", "4AM", "5AM",
    "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
    "12PM", "1PM", "2PM", "3PM", "4PM", "5PM",
    "6PM", "7PM", "8PM", "9PM", "10PM", "11PM",
]


def peak_crime_hours(incidents: list[dict]) -> dict[str, Any]:
    hourly = [0] * 24
    for inc in incidents:
        try:
            reported = inc.get("reported_at")
            if isinstance(reported, str):
                reported = datetime.fromisoformat(reported.replace("Z", "+00:00"))
            if reported:
                hourly[reported.hour] += 1
        except Exception:
            pass

    if not any(hourly):
        # Synthetic fallback for demo
        hourly = [2, 1, 1, 0, 0, 1, 3, 5, 6, 4, 3, 4, 5, 4, 3, 4, 6, 8, 14, 18, 16, 12, 9, 5]

    max_h = max(hourly) or 1
    data = [
        {"hour": i, "label": HOUR_LABELS[i], "count": hourly[i], "intensity": round(hourly[i] / max_h, 2)}
        for i in range(24)
    ]

    # Find peak window
    peak_hour = int(np.argmax(hourly))
    window_start = HOUR_LABELS[peak_hour]
    window_end = HOUR_LABELS[(peak_hour + 3) % 24]

    return {
        "hourly_data": data,
        "peak_window": f"{window_start}–{window_end}",
        "peak_hour": peak_hour,
        "peak_count": hourly[peak_hour],
    }


# ──────────────────────────────────────────────────────────────────────────────
# DBSCAN Hotspot Detection
# ──────────────────────────────────────────────────────────────────────────────
RISK_COLORS = {
    "Critical": "#ef4444",
    "High":     "#f97316",
    "Medium":   "#f59e0b",
    "Low":      "#22c55e",
}


def dbscan_hotspots(incidents: list[dict], area_name: str = "") -> list[dict]:
    if len(incidents) < 5:
        return []

    coords = np.array([[inc["lat"], inc["lng"]] for inc in incidents if "lat" in inc and "lng" in inc])
    if len(coords) < 5:
        return []

    # ε ≈ 300m in degrees; min_samples = 3
    db = DBSCAN(eps=0.003, min_samples=3, metric="euclidean").fit(coords)
    labels = db.labels_

    clusters: dict[int, list] = defaultdict(list)
    for idx, label in enumerate(labels):
        if label >= 0:
            clusters[label].append(idx)

    hotspots = []
    for cluster_id, idxs in clusters.items():
        cluster_incs = [incidents[i] for i in idxs if i < len(incidents)]
        cluster_coords = coords[idxs]
        centroid_lat = float(np.mean(cluster_coords[:, 0]))
        centroid_lng = float(np.mean(cluster_coords[:, 1]))
        crime_count = len(cluster_incs)
        avg_severity = float(np.mean([inc.get("severity", 5) for inc in cluster_incs]))
        intensity = round(min(crime_count / 20 * avg_severity / 10, 1.0), 2)

        if intensity >= 0.75:
            risk_level = "Critical"
        elif intensity >= 0.50:
            risk_level = "High"
        elif intensity >= 0.25:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        top_types = Counter(inc.get("crime_type", "Other") for inc in cluster_incs).most_common(2)

        hotspots.append({
            "id": cluster_id,
            "location": f"Cluster {cluster_id + 1}" + (f" near {area_name}" if area_name else ""),
            "lat": round(centroid_lat, 6),
            "lng": round(centroid_lng, 6),
            "crime_count": crime_count,
            "intensity": intensity,
            "risk_level": risk_level,
            "color": RISK_COLORS[risk_level],
            "top_crime_types": [t[0] for t in top_types],
        })

    hotspots.sort(key=lambda h: h["intensity"], reverse=True)
    return hotspots[:8]


# ──────────────────────────────────────────────────────────────────────────────
# Heatmap Data
# ──────────────────────────────────────────────────────────────────────────────
def generate_heatmap_data(incidents: list[dict]) -> list[dict]:
    """Return [lat, lng, intensity] points for leaflet-heat."""
    points = []
    for inc in incidents:
        lat = inc.get("lat")
        lng = inc.get("lng")
        sev = inc.get("severity", 5)
        if lat and lng:
            intensity = round(sev / 10, 2)
            points.append({"lat": lat, "lng": lng, "intensity": intensity})
    return points
