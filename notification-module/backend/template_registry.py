"""
template_registry.py
Event -> Message Template mapping for Rakshak AI Notification Engine.
Supported Events:
- HIGH_RISK_ROUTE
- SOS_TRIGGERED
- CRIME_NEARBY
- ROUTE_CHANGED
- EMERGENCY_NEARBY
"""
from typing import Dict, Any

TEMPLATES = {
    "HIGH_RISK_ROUTE": "⚠ High Risk Area Ahead: A historically high-risk crime segment is approximately {distance}m ahead. Exercise heightened vigilance.",
    "SOS_TRIGGERED": "🚨 EMERGENCY SOS ALERT: User {userId} triggered an emergency SOS alert at ({latitude}, {longitude}). Live tracking: {liveTrackUrl}",
    "CRIME_NEARBY": "⚠ Crime Alert: A {crimeType} was recently reported within {distanceKm}km of your location. Stay alert.",
    "ROUTE_CHANGED": "🔄 Route Updated: Navigation automatically re-routed to avoid an elevated risk zone. New safety score: {safetyScore}/100.",
    "EMERGENCY_NEARBY": "🚨 Emergency Support Available: {facilityName} ({facilityType}) is located {distanceKm}km away. Contact: {phone}."
}


def render_template(event_name: str, payload: Dict[str, Any]) -> str:
    """Interpolates payload fields into template string with safe fallback."""
    tmpl = TEMPLATES.get(event_name)
    if not tmpl:
        return payload.get("message") or f"Notification event: {event_name}"

    try:
        # Fill missing template keys gracefully with defaults
        defaults = {
            "distance": "500",
            "userId": "User",
            "latitude": "28.6139",
            "longitude": "77.2090",
            "liveTrackUrl": "https://rakshak-ai.org/track",
            "crimeType": "Incident",
            "distanceKm": "1.0",
            "safetyScore": "85",
            "facilityName": "Nearest Station",
            "facilityType": "Police",
            "phone": "112"
        }
        merged = {**defaults, **{k: str(v) for k, v in payload.items()}}
        return tmpl.format(**merged)
    except Exception:
        return payload.get("message") or tmpl
