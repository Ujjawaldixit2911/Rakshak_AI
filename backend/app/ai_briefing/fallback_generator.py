"""
fallback_generator.py
Deterministic fallback template generator for Rakshak AI Safety Briefings.
Builds natural-language explanations directly from structured JSON without requiring an active LLM.
Guarantees zero downtime, instant fallback, and structured explainability ("Why?" section).
"""
from typing import Dict, Any, List


def generate_fallback_briefing(data: Dict[str, Any]) -> str:
    """
    Generates a natural-language safety summary and explainability breakdown directly from input JSON metrics.
    """
    distance = data.get("distance", 0.0)
    duration = data.get("duration", 0)
    safety_score = data.get("safetyScore", 0)
    hotspots = data.get("hotspots", 0)
    high_risk_segments = data.get("highRiskSegments", 0)
    breakdown: List[Dict[str, Any]] = data.get("breakdown") or []
    alt = data.get("alternative")

    # Paragraph 1: Route overview
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

    # Paragraph 2: "Why This Score?" Explainability Section
    why_section = ""
    if breakdown:
        positives = [f"{b['factor']} (+{b['impact']})" if b['impact'] > 0 else f"{b['factor']} ({b['impact']})" for b in breakdown if b.get('impact', 0) > 0]
        negatives = [f"{b['factor']} ({b['impact']})" for b in breakdown if b.get('impact', 0) < 0]

        parts = []
        if negatives:
            parts.append(f"Penalties: {', '.join(negatives)}")
        if positives:
            parts.append(f"Positive factors: {', '.join(positives)}")

        why_section = f"Why this score? {' | '.join(parts)}."
    else:
        why_section = f"Why this score? Baseline corridor safety evaluated based on historical incidents and illumination."

    # Paragraph 3: Alternative comparison & recommendation
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

        if diff_score > 0:
            score_comparison = f"increases Safety Score to {alt_score}/100 (+{diff_score})"
        elif diff_score < 0:
            score_comparison = f"has a Safety Score of {alt_score}/100"
        else:
            score_comparison = f"shares a similar Safety Score of {alt_score}/100"

        if alt.get("type") == "safest" or diff_score > 10:
            if high_risk_segments > 0:
                p3 = f"The {alt_type} Route {time_comparison} but {score_comparison} and avoids high-risk segments."
            else:
                p3 = f"The {alt_type} Route {time_comparison} and {score_comparison}."
            rec = f"Recommendation: {alt_type} Route"
        elif alt.get("type") == "fastest" and diff_duration < -5 and safety_score >= 70:
            p3 = f"The {alt_type} Route {time_comparison} while maintaining adequate safety ({alt_score}/100)."
            rec = f"Recommendation: {alt_type} Route"
        else:
            p3 = f"The {alt_type} Route {time_comparison} ({score_comparison})."
            rec = f"Recommendation: Safest Route" if safety_score < 70 else "Recommendation: Current Route"

        return f"{p1}\n\n{why_section}\n\n{p3}\n\n{rec}"

    # Single route fallback
    if safety_score >= 75:
        rec = "Recommendation: Current Route (Safe Corridor)"
    elif safety_score >= 50:
        rec = "Recommendation: Current Route (Proceed with Vigilance)"
    else:
        rec = "Recommendation: Seek Alternative Safe Route or Delay Travel"

    return f"{p1}\n\n{why_section}\n\n{rec}"
