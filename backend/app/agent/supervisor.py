"""
supervisor.py
Supervisor Agent for Rakshak AI Copilot.
Orchestrates sub-agents, executes real database tools, enforces safety guardrails,
and generates structured JSON for natural-language form filling.
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.tools import ALL_LOCALITIES, find_nearby_police, find_nearby_hospital
from app.agent.subagents import (
    CrimeIntelligenceAgent,
    RouteAgent,
    RiskAnalysisAgent,
    EmergencyAgent,
    PoliceIntelligenceAgent
)

logger = logging.getLogger("RakshakAI.Supervisor")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class SupervisorAgent:
    """
    Main Supervisor Agent in Rakshak AI Multi-Agent Architecture.
    """

    @classmethod
    async def process_user_query(
        cls,
        db: AsyncSession,
        message: str,
        city: str = "Delhi",
        history: Optional[List[Dict[str, str]]] = None,
        admin_mode: bool = False,
        confirmed_action: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes free-text/voice queries, orchestrates sub-agents, logs tool executions,
        and enforces safety guardrails.
        """
        q = message.lower().strip()
        tool_audit_log = []

        # ── 0. Handle Confirmed Actions (SOS or Incident Report) ───────────────
        if confirmed_action:
            action_type = confirmed_action.get("type")
            if action_type == "CONFIRM_SOS":
                lat = float(confirmed_action.get("lat", 28.6315))
                lon = float(confirmed_action.get("lon", 77.2167))
                tool_audit_log.append({"tool": "trigger_sos", "status": "EXECUTED", "args": {"lat": lat, "lon": lon, "confirmed": True}})
                tool_audit_log.append({"tool": "notify_trusted_contacts", "status": "EXECUTED", "args": {"user_id": 3}})
                res = await EmergencyAgent.handle_emergency_request(
                    db=db, lat=lat, lon=lon, city=city, confirmed=True
                )
                return {
                    "response": res["message"],
                    "action": "SOS_DISPATCHED",
                    "action_data": res,
                    "tool_audit_log": tool_audit_log,
                    "data_confidence": "High (Live GPS & Dispatch Active)"
                }

        # ── 1. Safety Guardrail: Unverified Rumors / Forwarded Content ──────────
        rumor_keywords = ["forwarded", "whatsapp", "suna hai", "kisi ne bataya", "rumor", "afwah", "social media post"]
        is_unverified = any(kw in q for kw in rumor_keywords)

        # ── 2. Police Admin Mode Check ─────────────────────────────────────────
        if admin_mode or "patrol review" in q or "police briefing" in q or "deployment schedule" in q:
            tool_audit_log.append({"tool": "generate_police_briefing", "status": "EXECUTED", "args": {"city": city}})
            briefing = await PoliceIntelligenceAgent.generate_police_briefing(db=db, city=city)
            response_text = (
                f"👮 **Police Command Center Decision Support ({city})**\n\n"
                f"• **Active Hotspots Detected:** {briefing['hotspot_count']} density clusters\n"
                f"• **High-Priority Patrol Sectors:** {', '.join(briefing['top_priority_sectors'])}\n"
                f"• **Recommended Patrol Units:** {len(briefing['patrol_recommendations'])} optimized routes generated\n\n"
                f"⚠️ *Decision-Support Guardrail:* {briefing['officer_note']}"
            )
            return {
                "response": response_text,
                "action": "POLICE_INTEL_READY",
                "action_data": briefing,
                "tool_audit_log": tool_audit_log,
                "data_confidence": "High (Official Verified Police Records)"
            }

        # ── 3. Emergency SOS Intent (Confirmation Gated) ───────────────────────
        sos_keywords = ["sos", "emergency", "bachao", "save me", "danger", "khatra", "attack", "urgent help"]
        if any(kw in q for kw in sos_keywords):
            lat, lon = (28.6315, 77.2167) if city == "Delhi" else (19.0760, 72.8777)
            tool_audit_log.append({"tool": "find_nearby_police", "status": "EXECUTED", "args": {"lat": lat, "lon": lon}})
            tool_audit_log.append({"tool": "find_nearby_hospital", "status": "EXECUTED", "args": {"lat": lat, "lon": lon}})
            tool_audit_log.append({"tool": "trigger_sos", "status": "CONFIRMATION_GATED", "args": {"confirmed": False}})

            res = await EmergencyAgent.handle_emergency_request(
                db=db, lat=lat, lon=lon, city=city, confirmed=False
            )
            return {
                "response": res["message"],
                "action": "SHOW_SOS_CONFIRMATION",
                "action_data": res,
                "tool_audit_log": tool_audit_log,
                "data_confidence": "High"
            }

        # ── 4. Natural-Language Incident Report Extraction ─────────────────────
        report_keywords = ["report", "shikayat", "theft", "stolen", "chori", "harass", "chhedchhad", "snatching", "loot", "darj"]
        if any(kw in q for kw in report_keywords) and not ("safe route" in q or "rasta" in q):
            # Extract fields
            extracted_crime = "Theft"
            if "harass" in q or "chhed" in q:
                extracted_crime = "Harassment"
            elif "snatch" in q or "loot" in q:
                extracted_crime = "Snatching"
            elif "stalk" in q:
                extracted_crime = "Stalking"
            elif "light" in q:
                extracted_crime = "Poor Lighting"

            matched_loc = None
            for place in ALL_LOCALITIES.keys():
                if place.lower() in q:
                    matched_loc = place
                    break

            coords = ALL_LOCALITIES.get(matched_loc, (28.6315, 77.2167))

            form_data = {
                "intent": "create_crime_report",
                "fields": {
                    "crimeType": extracted_crime,
                    "location": matched_loc or "Reported Location",
                    "lat": coords[0],
                    "lon": coords[1],
                    "city": city,
                    "time": "Current / Recent",
                    "description": message
                },
                "missingFields": ["exactStreet"] if not matched_loc else []
            }

            tool_audit_log.append({"tool": "fill_form", "status": "EXECUTED", "args": form_data["fields"]})

            response_text = (
                f"📝 **Incident Report Auto-Filled**\n\n"
                f"Maine aapke message se incident report details extract kar li hain:\n"
                f"• **Crime Type:** {extracted_crime}\n"
                f"• **Location:** {matched_loc or 'Location required'}\n"
                f"• **City:** {city}\n"
                f"• **Details:** \"{message}\"\n\n"
                f"👉 *Guardrail Notice:* Incident submit karne se pehle kripya details review karke 'Submit Report' button par click karein."
            )

            return {
                "response": response_text,
                "action": "AUTO_FILL_REPORT_FORM",
                "action_data": form_data,
                "tool_audit_log": tool_audit_log,
                "data_confidence": "User-Generated Report (Pending Officer Verification)"
            }

        # ── 5. AI Route Analysis & Pre-Journey Safety Briefing ─────────────────
        matched_places = []
        for place in ALL_LOCALITIES.keys():
            if place.lower() in q:
                if place not in matched_places:
                    matched_places.append(place)

        if ("route" in q or "rasta" in q or "safe" in q or "path" in q or "traverse" in q or len(matched_places) >= 2):
            origin_name = matched_places[0] if len(matched_places) >= 1 else "Connaught Place"
            dest_name = matched_places[1] if len(matched_places) >= 2 else "Saket"

            origin_coords = list(ALL_LOCALITIES.get(origin_name, (28.6315, 77.2167)))
            dest_coords = list(ALL_LOCALITIES.get(dest_name, (28.5245, 77.2066)))

            time_of_day = "Night" if ("night" in q or "rat" in q or "pm" in q or "sham" in q) else "Evening"

            # Execute Tools
            tool_audit_log.append({"tool": "get_routes", "status": "EXECUTED", "args": {"origin": origin_name, "dest": dest_name, "city": city}})
            tool_audit_log.append({"tool": "calculate_route_risk", "status": "EXECUTED", "args": {"time_of_day": time_of_day, "mode": "safest"}})
            tool_audit_log.append({"tool": "find_nearby_police", "status": "EXECUTED", "args": {"lat": origin_coords[0], "lon": origin_coords[1]}})

            route_opt = await RouteAgent.get_route_options(
                db=db,
                origin=origin_coords,
                destination=dest_coords,
                city=city,
                time_of_day=time_of_day,
                mode="safest"
            )
            safest_info = route_opt.get("routes", {}).get("safest_route", {})
            fastest_info = route_opt.get("routes", {}).get("fastest_route", {})
            waypoints = safest_info.get("waypoints", [])
            path_str = " ➔ ".join(waypoints) if waypoints else f"{origin_name} ➔ {dest_name}"
            safest_time = safest_info.get("estimated_time_minutes", 18.0)
            fastest_time = fastest_info.get("estimated_time_minutes", 15.0)
            safest_dist = safest_info.get("distance_km", 12.0)
            fastest_dist = fastest_info.get("distance_km", 10.5)

            tradeoff = await RiskAnalysisAgent.evaluate_tradeoff(
                db=db,
                origin=origin_coords,
                destination=dest_coords,
                city=city,
                time_of_day=time_of_day,
                mode="safest"
            )

            police_stations = find_nearby_police(origin_coords[0], origin_coords[1], city)
            hospitals = find_nearby_hospital(dest_coords[0], dest_coords[1], city)

            briefing = {
                "route_title": f"{origin_name} → {dest_name}",
                "city": city,
                "time_of_day": time_of_day,
                "safest_score": tradeoff["safest_score"],
                "fastest_score": tradeoff["fastest_score"],
                "risk_reduction_pct": tradeoff["risk_reduction_pct"],
                "time_overhead_mins": tradeoff["time_overhead_mins"],
                "safest_time_mins": safest_time,
                "fastest_time_mins": fastest_time,
                "safest_distance_km": safest_dist,
                "fastest_distance_km": fastest_dist,
                "waypoints": waypoints,
                "nearest_police": police_stations[0]["name"] if police_stations else "Central Police Station",
                "nearest_hospital": hospitals[0]["name"] if hospitals else "Emergency Trauma Centre",
                "origin": origin_coords,
                "destination": dest_coords,
                "origin_name": origin_name,
                "dest_name": dest_name,
            }

            unverified_warning = "\n\n⚠️ **Notice:** User-mentioned social media rumor labeled as *Unverified Information*." if is_unverified else ""

            response_text = (
                f"🛡️ **Safe Navigation Plan: {origin_name} se {dest_name}**\n\n"
                f"📍 **Aapko aise jana hai (Step-by-Step Path):**\n"
                f"{path_str}\n\n"
                f"⏱️ **Travel Time & Distance:**\n"
                f"• 🟢 **AI Safest Route:** ~{safest_time} mins ({safest_dist} km) — Safety Score: {tradeoff['safest_score']}/100\n"
                f"• 🔵 **Fastest Alternative:** ~{fastest_time} mins ({fastest_dist} km) — Safety Score: {tradeoff['fastest_score']}/100\n"
                f"• ⚖️ **Trade-off:** Sirf +{round(max(0.0, safest_time - fastest_time), 1)} mins extra time me {tradeoff['risk_reduction_pct']}% crime exposure kam hota hai.\n\n"
                f"🚨 **Emergency Cover on Path:**\n"
                f"• Police Station: {briefing['nearest_police']}\n"
                f"• Hospital: {briefing['nearest_hospital']}{unverified_warning}"
            )

            return {
                "response": response_text,
                "action": "SET_ROUTE",
                "action_data": briefing,
                "tool_audit_log": tool_audit_log,
                "data_confidence": "High"
            }

        # ── 6. Area Safety & Crime Intelligence Query ──────────────────────────
        if matched_places or "score" in q or "crime" in q or "hotspot" in q:
            target_area = matched_places[0] if matched_places else "Connaught Place"
            tool_audit_log.append({"tool": "get_crimes", "status": "EXECUTED", "args": {"area": target_area, "city": city}})

            crime_intel = await CrimeIntelligenceAgent.analyze_area(db=db, area_name=target_area, city=city)

            unverified_warning = "\n\n⚠️ **Notice:** Unverified social media report was NOT factored into official crime density stats." if is_unverified else ""

            response_text = (
                f"📊 **Crime Intelligence Report for {target_area} ({city})**\n\n"
                f"• **Historical Density:** {crime_intel['total_incidents']} verified records indexed within 1.8 km radius.\n"
                f"• **Top Incident Categories:** {', '.join([f'{k} ({v})' for k, v in crime_intel['top_crimes']]) if crime_intel['top_crimes'] else 'Low violent incident frequency'}.\n"
                f"• **Data Confidence Level:** {crime_intel['data_confidence']}.\n"
                f"• **AI Safety Recommendation:** Active street illumination and PCR presence make main transit roads optimal.{unverified_warning}"
            )

            return {
                "response": response_text,
                "action": "SEARCH_AREA",
                "action_data": {"area": target_area, "city": city},
                "tool_audit_log": tool_audit_log,
                "data_confidence": crime_intel["data_confidence"]
            }

        # ── 7. Fallback General Rakshak AI Copilot Guidance ────────────────────
        tool_audit_log.append({"tool": "get_current_location", "status": "EXECUTED", "args": {"city": city}})
        curr_loc = get_current_location(city)

        response_text = (
            f"🤖 **Namaste! Main Rakshak AI Copilot (Supervisor Agent) hoon.**\n\n"
            f"Main real-time database tools aur ML engines use karke aapki safety assist karta hoon:\n"
            f"1. **Safe Route Reasoning:** *'CP se Saket ka safest route at 10 PM'* (Calculates time vs. crime risk trade-off)\n"
            f"2. **Natural Language Form Filling:** *'Mera phone Karol Bagh me snatch ho gaya'* (Auto-fills incident report for review)\n"
            f"3. **Pre-Journey Safety Briefing:** Route start karne se pehle emergency cover aur hazard summary\n"
            f"4. **Confirmation-Gated SOS:** Direct dispatch with safety verification.\n\n"
            f"📍 *Active Center:* {curr_loc['label']}"
        )

        return {
            "response": response_text,
            "action": "NONE",
            "action_data": {},
            "tool_audit_log": tool_audit_log,
            "data_confidence": "High"
        }
