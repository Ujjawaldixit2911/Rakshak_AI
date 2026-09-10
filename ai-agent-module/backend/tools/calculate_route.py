"""
calculate_route.py
Tool wrapper calling the Route Module REST API (/api/route/calculate).
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("RakshakAI.Tool.CalculateRoute")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def calculate_route(
    source_lat: float,
    source_lng: float,
    dest_lat: float,
    dest_lng: float,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Calculates driving route distance, duration, and GeoJSON polyline via POST /api/route/calculate.
    """
    url = f"{INTERNAL_API_BASE}/api/route/calculate"
    payload = {
        "source": {"lat": float(source_lat), "lng": float(source_lng)},
        "destination": {"lat": float(dest_lat), "lng": float(dest_lng)}
    }

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        should_close = True

    try:
        res = await client.post(url, json=payload)
        if res.status_code == 200:
            return res.json()
        elif res.status_code == 404:
            return {"error": "route_not_found", "message": "No drivable route found between coordinates."}
        else:
            return {"error": f"Route service returned status {res.status_code}"}
    except Exception as e:
        logger.error("Error in calculate_route tool: %s", e)
        return {"error": str(e)}
    finally:
        if should_close:
            await client.aclose()
