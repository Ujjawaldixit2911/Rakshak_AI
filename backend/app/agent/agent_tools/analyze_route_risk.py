"""
analyze_route_risk.py
Tool wrapper calling Route Risk Analysis Module REST API (/api/risk/analyze-route).
"""
import os
import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger("RakshakAI.Tool.AnalyzeRouteRisk")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def analyze_route_risk(
    geometry: List[List[float]],
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    if not geometry or len(geometry) < 2:
        return {"error": "Invalid geometry provided (must contain at least 2 coordinate points)"}

    url = f"{INTERNAL_API_BASE}/api/risk/analyze-route"
    payload = {"geometry": geometry}

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        should_close = True

    try:
        res = await client.post(url, json=payload)
        if res.status_code == 200:
            return res.json()
        else:
            return {"error": f"Route risk service returned status {res.status_code}"}
    except Exception as e:
        logger.error("Error in analyze_route_risk tool: %s", e)
        return {"error": str(e)}
    finally:
        if should_close:
            await client.aclose()
