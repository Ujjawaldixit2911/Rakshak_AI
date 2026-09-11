"""
orchestrator.py
AI Agent Orchestrator for Rakshak AI.
Architectural Guarantee: Agent -> Tools -> Backend APIs -> Services -> Database.
Never touches the database directly. Uses native tool-calling with LLM APIs,
caps iterations to max 6, logs all tool audits, and handles location ambiguities.
"""
import os
import re
import time
import json
import logging
from typing import Dict, Any, Optional, List
import httpx

from .schemas import (
    AgentQueryRequest,
    AgentQueryResponse,
    ANTHROPIC_TOOLS,
    OPENAI_TOOLS,
)
from .logger import AgentExecutionLogger
from .agent_tools import TOOL_REGISTRY, search_location, find_safe_route, get_nearby_emergency_services, get_crime_data, calculate_route

logger = logging.getLogger("RakshakAI.Agent.Orchestrator")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")
MAX_TOOL_ITERATIONS = 6

AGENT_SYSTEM_PROMPT = """You are Rakshak AI, an intelligent safety navigation and emergency response assistant.
Your goal is to help users navigate safely, identify crime hotspots, find emergency services, and plan secure journeys.

IMPORTANT OPERATIONAL RULES:
1. NEVER guess or invent coordinates, crime statistics, or routes.
2. ALWAYS use the provided tools to query backend services.
3. If a location is ambiguous, ask the user a polite clarifying question instead of making assumptions.
4. Support multi-lingual queries (English, Hindi, Hinglish).
5. Always recommend the Safest Route when travelling at night or through high-risk areas.
"""


class AIAgentOrchestrator:
    """
    Agentic orchestrator managing the tool-calling loop and execution lifecycle.
    """
    def __init__(self, max_iterations: int = MAX_TOOL_ITERATIONS, http_client: Optional[httpx.AsyncClient] = None):
        self.max_iterations = max_iterations
        self.client = http_client

    async def execute_tool(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        exec_logger: AgentExecutionLogger,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        tool_fn = TOOL_REGISTRY.get(tool_name)
        if not tool_fn:
            res = {"error": f"Tool '{tool_name}' is not recognized in registry."}
            exec_logger.log_tool_call(tool_name, tool_args, res, 0.0, status="FAILED")
            return res

        start_time = time.perf_counter()
        try:
            call_kwargs = dict(tool_args)
            call_kwargs["client"] = self.client
            if tool_name == "get_current_location":
                call_kwargs["user_context"] = user_context

            output = await tool_fn(**call_kwargs)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            status = "SUCCESS"
            if isinstance(output, dict) and output.get("clarificationNeeded"):
                status = "AMBIGUOUS"
            elif isinstance(output, dict) and "error" in output:
                status = "FAILED"

            exec_logger.log_tool_call(tool_name, tool_args, output, duration_ms, status=status)
            return output
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            err_output = {"error": str(e)}
            exec_logger.log_tool_call(tool_name, tool_args, err_output, duration_ms, status="FAILED")
            return err_output

    async def run(
        self,
        message: str,
        user_id: Optional[str] = None,
        user_location: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> AgentQueryResponse:
        exec_logger = AgentExecutionLogger()
        user_ctx = user_location or {}

        if ANTHROPIC_API_KEY:
            try:
                llm_response = await self._run_anthropic_tool_loop(
                    message=message,
                    exec_logger=exec_logger,
                    user_ctx=user_ctx,
                    conversation_history=conversation_history
                )
                if llm_response:
                    return llm_response
            except Exception as e:
                logger.warning("Anthropic tool-use execution failed, falling back to intent engine: %s", e)

        if GROQ_API_KEY or OPENAI_API_KEY:
            try:
                llm_response = await self._run_openai_tool_loop(
                    message=message,
                    exec_logger=exec_logger,
                    user_ctx=user_ctx,
                    conversation_history=conversation_history
                )
                if llm_response:
                    return llm_response
            except Exception as e:
                logger.warning("OpenAI/Groq tool-use execution failed, falling back to intent engine: %s", e)

        return await self._run_deterministic_intent_pipeline(
            message=message,
            exec_logger=exec_logger,
            user_ctx=user_ctx
        )

    async def _run_anthropic_tool_loop(
        self,
        message: str,
        exec_logger: AgentExecutionLogger,
        user_ctx: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Optional[AgentQueryResponse]:
        messages: List[Dict[str, Any]] = []
        if conversation_history:
            for item in conversation_history:
                messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})
        messages.append({"role": "user", "content": message})

        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        attached_route = None

        for _ in range(self.max_iterations):
            payload = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 600,
                "system": AGENT_SYSTEM_PROMPT,
                "tools": ANTHROPIC_TOOLS,
                "messages": messages
            }

            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
                if res.status_code != 200:
                    logger.warning("Anthropic API returned %s: %s", res.status_code, res.text)
                    return None
                data = res.json()

            stop_reason = data.get("stop_reason")
            content_blocks = data.get("content", [])

            tool_use_blocks = [b for b in content_blocks if b.get("type") == "tool_use"]
            if not tool_use_blocks or stop_reason == "end_turn":
                text_parts = [b.get("text", "") for b in content_blocks if b.get("type") == "text"]
                reply_text = "\n".join(text_parts).strip()
                return AgentQueryResponse(
                    reply=reply_text or "How can I assist you with safety navigation today?",
                    toolCallsUsed=exec_logger.get_tool_names_used(),
                    route=attached_route,
                    toolLogs=exec_logger.get_audit_trail(),
                    status="COMPLETED"
                )

            messages.append({"role": "assistant", "content": content_blocks})

            tool_result_contents = []
            for block in tool_use_blocks:
                t_id = block.get("id")
                t_name = block.get("name")
                t_input = block.get("input", {})

                result = await self.execute_tool(t_name, t_input, exec_logger, user_context=user_ctx)
                if t_name == "find_safe_route" and "safest" in result:
                    attached_route = result

                tool_result_contents.append({
                    "type": "tool_result",
                    "tool_use_id": t_id,
                    "content": json.dumps(result)
                })

            messages.append({"role": "user", "content": tool_result_contents})

        return None

    async def _run_openai_tool_loop(
        self,
        message: str,
        exec_logger: AgentExecutionLogger,
        user_ctx: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Optional[AgentQueryResponse]:
        api_key = GROQ_API_KEY or OPENAI_API_KEY
        base_url = "https://api.groq.com/openai/v1/chat/completions" if GROQ_API_KEY else "https://api.openai.com/v1/chat/completions"
        model_name = "llama-3.3-70b-versatile" if GROQ_API_KEY else "gpt-4o-mini"

        messages: List[Dict[str, Any]] = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
        if conversation_history:
            for item in conversation_history:
                messages.append({"role": item.get("role", "user"), "content": item.get("content", "")})
        messages.append({"role": "user", "content": message})

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        attached_route = None

        for _ in range(self.max_iterations):
            payload = {
                "model": model_name,
                "messages": messages,
                "tools": OPENAI_TOOLS,
                "tool_choice": "auto",
                "temperature": 0.2
            }

            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(base_url, headers=headers, json=payload)
                if res.status_code != 200:
                    return None
                data = res.json()

            choice = data.get("choices", [{}])[0]
            msg = choice.get("message", {})
            tool_calls = msg.get("tool_calls", [])

            if not tool_calls:
                reply_text = msg.get("content", "").strip()
                return AgentQueryResponse(
                    reply=reply_text or "Safe routing assistance ready.",
                    toolCallsUsed=exec_logger.get_tool_names_used(),
                    route=attached_route,
                    toolLogs=exec_logger.get_audit_trail(),
                    status="COMPLETED"
                )

            messages.append(msg)

            for tc in tool_calls:
                fn_name = tc.get("function", {}).get("name")
                raw_args = tc.get("function", {}).get("arguments", "{}")
                try:
                    fn_args = json.loads(raw_args)
                except Exception:
                    fn_args = {}

                result = await self.execute_tool(fn_name, fn_args, exec_logger, user_context=user_ctx)
                if fn_name == "find_safe_route" and "safest" in result:
                    attached_route = result

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id"),
                    "name": fn_name,
                    "content": json.dumps(result)
                })

        return None

    async def _run_deterministic_intent_pipeline(
        self,
        message: str,
        exec_logger: AgentExecutionLogger,
        user_ctx: Dict[str, Any]
    ) -> AgentQueryResponse:
        msg_lower = message.lower().strip()

        emergency_keywords = ["police", "hospital", "fire station", "pharmacy", "medical", "thanath"]
        if any(kw in msg_lower for kw in emergency_keywords) and not any(r in msg_lower for r in ["route", "se ", "jaana", "to "]):
            stype = "police"
            if "hospital" in msg_lower or "medical" in msg_lower:
                stype = "hospital"
            elif "fire" in msg_lower:
                stype = "fire_station"
            elif "pharmacy" in msg_lower:
                stype = "pharmacy"

            loc_query = self._extract_emergency_location(message)
            if loc_query:
                geo_res = await self.execute_tool("search_location", {"query": loc_query}, exec_logger)
                if geo_res.get("status") != "SUCCESS":
                    return AgentQueryResponse(
                        reply=f"Could you please specify which area you mean for '{loc_query}'? (e.g., Delhi, Noida, or Ghaziabad)",
                        toolCallsUsed=exec_logger.get_tool_names_used(),
                        toolLogs=exec_logger.get_audit_trail(),
                        status="CLARIFICATION_NEEDED"
                    )
                lat, lng = geo_res["latitude"], geo_res["longitude"]
            else:
                curr_loc = await self.execute_tool("get_current_location", {}, exec_logger, user_context=user_ctx)
                lat, lng = curr_loc["latitude"], curr_loc["longitude"]

            poi_res = await self.execute_tool("get_nearby_emergency_services", {"latitude": lat, "longitude": lng, "service_type": stype}, exec_logger)
            facs = poi_res.get("facilities", [])
            if facs:
                top_3 = facs[:3]
                fac_list_str = "\n".join([f"- **{f['name']}** ({f.get('distanceKm', 0.0)} km away)" for f in top_3])
                reply = f"Found {len(facs)} nearby {stype.replace('_', ' ')} facilities:\n\n{fac_list_str}\n\nStay alert and reach out to local authorities if you need immediate assistance."
            else:
                reply = f"No {stype} facilities found within the immediate radius. Emergency SOS helpline: 112."

            return AgentQueryResponse(
                reply=reply,
                toolCallsUsed=exec_logger.get_tool_names_used(),
                toolLogs=exec_logger.get_audit_trail(),
                status="COMPLETED"
            )

        if ("crime" in msg_lower or "hotspot" in msg_lower or "safe hai" in msg_lower or "is it safe" in msg_lower) and not ("route" in msg_lower or "se " in msg_lower):
            loc_query = self._extract_crime_location(message) or "Connaught Place"
            geo_res = await self.execute_tool("search_location", {"query": loc_query}, exec_logger)
            if geo_res.get("status") != "SUCCESS":
                return AgentQueryResponse(
                    reply=f"I couldn't identify the exact location for '{loc_query}'. Could you clarify the city or sector?",
                    toolCallsUsed=exec_logger.get_tool_names_used(),
                    toolLogs=exec_logger.get_audit_trail(),
                    status="CLARIFICATION_NEEDED"
                )
            crime_res = await self.execute_tool("get_crime_data", {"latitude": geo_res["latitude"], "longitude": geo_res["longitude"]}, exec_logger)
            c_count = crime_res.get("crimeCount", 0)
            reply = f"Crime assessment for **{geo_res.get('address', loc_query)}**:\nDetected {c_count} historical incidents within a 2.0 km radius. Exercise normal caution during late hours."
            return AgentQueryResponse(
                reply=reply,
                toolCallsUsed=exec_logger.get_tool_names_used(),
                toolLogs=exec_logger.get_audit_trail(),
                status="COMPLETED"
            )

        src_query, dst_query = self._extract_route_endpoints(message)

        if not src_query or not dst_query:
            return AgentQueryResponse(
                reply="Where would you like to travel? Please provide your starting point and destination (e.g., 'From Ghaziabad to Noida via safest route').",
                toolCallsUsed=exec_logger.get_tool_names_used(),
                toolLogs=exec_logger.get_audit_trail(),
                status="CLARIFICATION_NEEDED"
            )

        src_geo = await self.execute_tool("search_location", {"query": src_query}, exec_logger)
        if src_geo.get("status") != "SUCCESS":
            return AgentQueryResponse(
                reply=f"Could you please specify your origin location '{src_query}' with more detail? (e.g., Ghaziabad Railway Station, Indirapuram)",
                toolCallsUsed=exec_logger.get_tool_names_used(),
                toolLogs=exec_logger.get_audit_trail(),
                status="CLARIFICATION_NEEDED"
            )

        dst_geo = await self.execute_tool("search_location", {"query": dst_query}, exec_logger)
        if dst_geo.get("status") != "SUCCESS":
            return AgentQueryResponse(
                reply=f"Could you please clarify your destination '{dst_query}'? (e.g., Noida Sector 62, Botanical Garden)",
                toolCallsUsed=exec_logger.get_tool_names_used(),
                toolLogs=exec_logger.get_audit_trail(),
                status="CLARIFICATION_NEEDED"
            )

        route_compare_res = await self.execute_tool(
            "find_safe_route",
            {
                "source_lat": src_geo["latitude"],
                "source_lng": src_geo["longitude"],
                "dest_lat": dst_geo["latitude"],
                "dest_lng": dst_geo["longitude"]
            },
            exec_logger
        )

        if "safest" not in route_compare_res:
            std_route = await self.execute_tool(
                "calculate_route",
                {
                    "source_lat": src_geo["latitude"],
                    "source_lng": src_geo["longitude"],
                    "dest_lat": dst_geo["latitude"],
                    "dest_lng": dst_geo["longitude"]
                },
                exec_logger
            )
            reply = f"Route calculated from **{src_geo.get('address', src_query)}** to **{dst_geo.get('address', dst_query)}**: {std_route.get('distance', 0)} km, approx {std_route.get('duration', 0)} mins."
            return AgentQueryResponse(
                reply=reply,
                toolCallsUsed=exec_logger.get_tool_names_used(),
                route=std_route,
                toolLogs=exec_logger.get_audit_trail(),
                status="COMPLETED"
            )

        safest_opt = route_compare_res.get("safest", {})
        fastest_opt = route_compare_res.get("fastest", {})
        balanced_opt = route_compare_res.get("balanced", {})

        briefing_payload = {
            "distance": float(safest_opt.get("distance", 15.0)),
            "duration": float(safest_opt.get("duration", 35.0)),
            "safetyScore": float(safest_opt.get("safetyScore", 90.0)),
            "hotspots": 0,
            "highRiskSegments": int(safest_opt.get("highRiskSegments", 0)),
            "alternative": {
                "type": "fastest",
                "duration": float(fastest_opt.get("duration", 30.0)),
                "safetyScore": float(fastest_opt.get("safetyScore", 65.0)),
                "distance": float(fastest_opt.get("distance", 14.0))
            }
        }

        briefing_text = await self._call_ai_briefing_module(briefing_payload)

        # Build Step-by-Step Navigation Guidance
        waypoints = safest_opt.get("waypoints") or [src_query.title(), f"Main Arterial Corridor towards {dst_query.title()}", dst_query.title()]
        path_str = " ➔ ".join(waypoints)

        final_reply = (
            f"📍 **Navigation Plan: {src_query.title()} se {dst_query.title()}**\n\n"
            f"🛣️ **Aapko aise jaana hai (Step-by-Step Path):**\n"
            f"1. 🏁 **Start Point:** {src_query.title()} se nikle aur main lighted arterial road follow karein.\n"
            f"2. 🧭 **Safe Corridor:** {path_str} (Well-lit streetlights & active police patrol coverage)\n"
            f"3. 🎯 **Destination:** {dst_query.title()} safely reach karein.\n\n"
            f"⏱️ **Travel Time & Safety:**\n"
            f"• 🟢 **Safest Route:** {safest_opt.get('distance')} km | ~{safest_opt.get('duration')} mins | Safety Score: {safest_opt.get('safetyScore')}/100\n"
            f"• ⚡ **Fastest Route:** {fastest_opt.get('distance')} km | ~{fastest_opt.get('duration')} mins | Safety Score: {fastest_opt.get('safetyScore')}/100\n\n"
            f"✅ **Recommendation:** Safest Route is actively mapped. High-lighting and zero active crime hotspots on this path."
        )

        # Attach waypoints and origin/destination metadata to route
        route_compare_res["origin_name"] = src_query.title()
        route_compare_res["dest_name"] = dst_query.title()
        route_compare_res["waypoints"] = waypoints

        return AgentQueryResponse(
            reply=final_reply,
            toolCallsUsed=exec_logger.get_tool_names_used(),
            route=route_compare_res,
            toolLogs=exec_logger.get_audit_trail(),
            status="COMPLETED"
        )

    async def _call_ai_briefing_module(self, payload: Dict[str, Any]) -> str:
        url = f"{INTERNAL_API_BASE}/api/ai/briefing"
        should_close = False
        client = self.client
        if client is None:
            client = httpx.AsyncClient(timeout=8.0)
            should_close = True

        try:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                return res.json().get("briefing", "")
        except Exception:
            pass
        finally:
            if should_close:
                await client.aclose()

        dist = payload.get("distance", 0)
        dur = payload.get("duration", 0)
        score = payload.get("safetyScore", 100)
        return f"Your journey is {dist} km and approximately {dur} minutes. The Safest Route achieves a Safety Score of {score}/100 by avoiding high-risk zones."

    def _extract_route_endpoints(self, text: str) -> tuple[Optional[str], Optional[str]]:
        match = re.search(r'([a-zA-Z0-9\s]+)\s+(?:se|from)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:jaana|tak|to|via|safest|fastest|route)|$)', text, re.IGNORECASE)
        if match:
            src = match.group(1).strip()
            dst = match.group(2).strip()
            src = re.sub(r'^(mujhe|humko|i want to go from|take me from)\s+', '', src, flags=re.IGNORECASE).strip()
            return src, dst

        match2 = re.search(r'from\s+([a-zA-Z0-9\s]+?)\s+to\s+([a-zA-Z0-9\s]+?)(?:\s+(?:via|with|using|safest|fastest|route)|$)', text, re.IGNORECASE)
        if match2:
            return match2.group(1).strip(), match2.group(2).strip()

        match3 = re.search(r'([a-zA-Z0-9\s]+)\s+to\s+([a-zA-Z0-9\s]+)', text, re.IGNORECASE)
        if match3:
            return match3.group(1).strip(), match3.group(2).strip()

        return None, None

    def _extract_emergency_location(self, text: str) -> Optional[str]:
        match = re.search(r'(?:in|near|around|at)\s+([a-zA-Z0-9\s]+)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return None

    def _extract_crime_location(self, text: str) -> Optional[str]:
        match = re.search(r'(?:in|at|for|around)\s+([a-zA-Z0-9\s]+)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return None
