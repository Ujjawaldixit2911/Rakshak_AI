"""
fallback_generator.py
Deterministic fallback generator for Safety Briefings.
"""
from typing import Dict, Any

def generate_fallback_briefing(data: Dict[str, Any]) -> str:
    distance = data.get("distance", 0.0)
    duration = data.get("duration", 0)
    safety_score = data.get("safetyScore", 0)
    hotspots = data.get("hotspots", 0)
    high_risk_segments = data.get("highRiskSegments", 0)
    alt = data.get("alternative")

    hotspot_phrase = (
        f"{hotspots} historical crime hotspot{'s' if hotspots != 1 else ''}"
        if hotspots > 0 else "no major crime hotspots"
    )
    risk_seg_phrase = (
        f"{high_risk_segments} high-risk segment{'s' if high_risk_segments != 1 else ''}"
        if high_risk_segments > 0 else "0 high-risk segments"
    )

    p1 = (
        f"Your journey is {distance} km and approximately {duration} minutes with a Safety Score of {safety_score}/100. "
        f"The selected route contains {hotspot_phrase} and {risk_seg_phrase}."
    )

    if alt and isinstance(alt, dict):
        alt_type = alt.get("type", "safest").replace("_", " ").title()
        alt_duration = alt.get("duration", duration)
        alt_score = alt.get("safetyScore", safety_score)
        diff_duration = round(alt_duration - duration, 1)
        diff_score = round(alt_score - safety_score, 1)

        if diff_duration > 0:
            time_comparison = f"adds approximately {int(diff_duration) if diff_duration.is_integer() else diff_duration} minute(s)"
        elif diff_duration < 0:
            time_comparison = f"saves approximately {abs(int(diff_duration) if diff_duration.is_integer() else diff_duration)} minute(s)"
        else:
            time_comparison = "takes the same travel time"

        score_comparison = f"increases Safety Score to {alt_score}/100" if diff_score > 0 else f"has a Safety Score of {alt_score}/100"

        if alt.get("type") == "safest" or diff_score > 10:
            p2 = f"The {alt_type} Route {time_comparison} but {score_comparison} and avoids high-risk segments."
            rec = f"Recommendation: {alt_type} Route"
        else:
            p2 = f"The {alt_type} Route {time_comparison} ({score_comparison})."
            rec = "Recommendation: Safest Route" if safety_score < 70 else "Recommendation: Current Route"

        return f"{p1} {p2}\n\n{rec}"

    rec = "Recommendation: Current Route (Safe Corridor)" if safety_score >= 70 else "Recommendation: Proceed with Vigilance"
    return f"{p1}\n\n{rec}"
