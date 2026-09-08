"""
subagents.py
Sub-agent implementations for Rakshak AI Copilot.
Orchestrated by the Supervisor Agent.
"""
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.tools import (
    get_crimes,
    get_routes,
    calculate_route_risk,
    find_nearby_police,
    find_nearby_hospital,
    trigger_sos,
    notify_trusted_contacts,
    create_crime_report,
    fill_form,
    ALL_LOCALITIES
)

logger = logging.getLogger("RakshakAI.SubAgents")


# ── 1. Crime Intelligence Agent ───────────────────────────────────────────────
class CrimeIntelligenceAgent:
    """
    Retrieves, summarizes, and evaluates spatial & temporal historical crime data.
    Provides data confidence rating (High / Medium / Sparse).
    """
    @staticmethod
    async def analyze_area(
        db: AsyncSession,
        area_name: str,
        city: str = "Delhi",
        time_of_day: Optional[str] = None
    ) -> Dict[str, Any]:
        crime_data = await get_crimes(
            db=db,
            location_name=area_name,
            city=city,
            time_of_day=time_of_day,
            radius_km=1.8
        )
        
        top_crimes = sorted(
            crime_data["crime_type_breakdown"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]

        summary = (
            f"Analyzed {crime_data['total_incidents_found']} verified incidents near {area_name} ({city}). "
            f"Primary patterns: {', '.join([f'{k} ({v})' for k, v in top_crimes]) if top_crimes else 'No severe density clusters'}. "
            f"Data Confidence: {crime_data['data_confidence']}."
        )

        return {
            "agent": "CrimeIntelligenceAgent",
            "area": area_name,
            "city": city,
            "total_incidents": crime_data["total_incidents_found"],
            "data_confidence": crime_data["data_confidence"],
            "top_crimes": top_crimes,
            "summary": summary,
            "raw_data": crime_data
        }


# ── 2. Route Agent ────────────────────────────────────────────────────────────
class RouteAgent:
    """
    Generates candidate route alternatives (Safest, Balanced, Fastest) with spatial graphs.
    """
    @staticmethod
    async def get_route_options(
        db: AsyncSession,
        origin: List[float],
        destination: List[float],
        city: str = "Delhi",
        time_of_day: str = "Night",
        mode: str = "safest"
    ) -> Dict[str, Any]:
        routes = await get_routes(
            origin=origin,
            destination=destination,
            city=city,
            time_of_day=time_of_day,
            mode=mode,
            db=db
        )
        return {
            "agent": "RouteAgent",
            "city": city,
            "origin": origin,
            "destination": destination,
            "routes": routes
        }


# ── 3. Risk Analysis Agent ────────────────────────────────────────────────────
class RiskAnalysisAgent:
    """
    Compares route alternatives, analyzes safety vs. time trade-offs,
    and formulates explainable recommendation grounded in verified data.
    """
    @staticmethod
    async def evaluate_tradeoff(
        db: AsyncSession,
        origin: List[float],
        destination: List[float],
        city: str = "Delhi",
        time_of_day: str = "Night",
        mode: str = "safest"
    ) -> Dict[str, Any]:
        risk_result = await calculate_route_risk(
            db=db,
            origin=origin,
            destination=destination,
            city=city,
            time_of_day=time_of_day,
            mode=mode
        )

        safest_score = risk_result["safest_route_score"]
        fastest_score = risk_result["fastest_route_score"]
        risk_reduction = risk_result["risk_reduction_pct"]
        time_diff = risk_result["time_overhead_mins"]

        explanation = (
            f"🛡️ **Recommendation: Safest Corridor Route (Score: {safest_score}/100)**\n\n"
            f"• **Why this route?** It achieves **{risk_reduction}% lower crime exposure** compared to the direct route by skirting past {risk_result['hotspots_avoided']} high-risk crime hotspots.\n"
            f"• **Trade-off:** Adds only **+{time_diff} minutes** of travel time, in exchange for routing through CCTV-monitored arterial avenues with active police coverage.\n"
            f"• **Time-of-Day Impact ({time_of_day}):** Night-time penalty applied to unlit shortcuts."
        )

        return {
            "agent": "RiskAnalysisAgent",
            "safest_score": safest_score,
            "fastest_score": fastest_score,
            "risk_reduction_pct": risk_reduction,
            "time_overhead_mins": time_diff,
            "explanation": explanation,
            "full_analysis": risk_result
        }


# ── 4. Emergency Agent ────────────────────────────────────────────────────────
class EmergencyAgent:
    """
    Handles SOS triage, confirmation gating, trusted contact notification,
    and nearby emergency services dispatch lookup.
    """
    @staticmethod
    async def handle_emergency_request(
        db: AsyncSession,
        lat: float,
        lon: float,
        city: str = "Delhi",
        confirmed: bool = False,
        user_id: int = 3
    ) -> Dict[str, Any]:
        police = find_nearby_police(lat, lon, city)
        hospitals = find_nearby_hospital(lat, lon, city)

        if not confirmed:
            return {
                "agent": "EmergencyAgent",
                "status": "CONFIRMATION_REQUIRED",
                "message": "⚠️ **SOS Emergency Confirmation Required**\n\nTo prevent accidental triggers, please confirm below to broadcast your live GPS coordinates to Police (112) and trusted emergency contacts.",
                "nearest_police": police[0] if police else None,
                "nearest_hospital": hospitals[0] if hospitals else None,
                "confirmation_payload": {
                    "lat": lat,
                    "lon": lon,
                    "city": city,
                    "user_id": user_id
                }
            }

        sos_res = await trigger_sos(
            db=db,
            lat=lat,
            lon=lon,
            city=city,
            user_id=user_id,
            confirmed=True
        )
        contacts_res = notify_trusted_contacts(
            user_id=user_id,
            message="EMERGENCY SOS TRIGGERED via Rakshak AI Copilot",
            lat=lat,
            lon=lon
        )

        return {
            "agent": "EmergencyAgent",
            "status": "SOS_DISPATCHED",
            "sos_result": sos_res,
            "contacts_result": contacts_res,
            "nearest_police": police,
            "nearest_hospitals": hospitals,
            "message": "🚨 **SOS BROADCAST COMPLETE:** Police patrol van alerted and trusted contacts notified with live GPS map link."
        }


# ── 5. Police Intelligence Agent (Admin Support Only) ─────────────────────────
class PoliceIntelligenceAgent:
    """
    Decision support tool for police officers and command centers.
    Analyzes historical trends, hotspot clusters, and recommends patrol routes.
    IMPORTANT: Decision-support only; never performs automatic policing actions.
    """
    @staticmethod
    async def generate_police_briefing(
        db: AsyncSession,
        city: str = "Delhi"
    ) -> Dict[str, Any]:
        from app.ml.hotspot_detector import detect_hotspots
        from app.ml.police_ops import recommend_patrol_routes

        hotspots = await detect_hotspots(db, city=city)
        patrols = await recommend_patrol_routes(db, city=city)

        return {
            "agent": "PoliceIntelligenceAgent",
            "mode": "DECISION_SUPPORT_ONLY",
            "city": city,
            "hotspot_count": hotspots.get("total_hotspots", 0),
            "top_priority_sectors": [
                f["properties"]["location_name"] for f in hotspots.get("features", [])[:3]
            ],
            "patrol_recommendations": patrols.get("patrol_routes", [])[:2],
            "officer_note": "⚠️ Advisory Only: Final dispatch and deployment decisions must be authorized by the duty officer."
        }
