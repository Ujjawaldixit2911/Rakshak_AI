"""
find_safe_route.py
Tool wrapper calling the Three-Route Comparison Engine REST API (/api/routes/compare).
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("RakshakAI.Tool.FindSafeRoute")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def find_safe_route(
    source_lat: float,
    source_lng: float,
    dest_lat: float,
    dest_lng: float,
    at_time: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Executes Three-Route comparison via POST /api/routes/compare.
    Returns evaluated Fastest, Safest, and Balanced routes with safety scores.
    """
    url = f"{INTERNAL_API_BASE}/api/routes/compare"
    payload = {
        "source": {"lat": float(source_lat), "lng": float(source_lng)},
        "destination": {"lat": float(dest_lat), "lng": float(dest_lng)},
        "atTime": at_time
    }

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=12.0)
        should_close = True

    try:
        res = await client.post(url, json=payload)
        if res.status_code == 200:
            return res.json()
        elif res.status_code == 404:
            return {"error": "route_not_found", "message": "No navigable routes found between the points."}
        else:
            return {"error": f"Route compare service returned status {res.status_code}"}
    except Exception as e:
        logger.error("Error in find_safe_route tool: %s", e)
        return {"error": str(e)}
    finally:
        if should_close:
            await client.aclose()
