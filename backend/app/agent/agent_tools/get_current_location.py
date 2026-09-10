"""
get_current_location.py
Tool wrapper calling the Location Module / GPS Context.
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("RakshakAI.Tool.CurrentLocation")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def get_current_location(
    userId: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    if user_context and "latitude" in user_context and "longitude" in user_context:
        return {
            "latitude": float(user_context["latitude"]),
            "longitude": float(user_context["longitude"]),
            "city": user_context.get("city", "Delhi"),
            "source": "user_gps_context"
        }

    return {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "city": "Delhi",
        "source": "default_city_center"
    }
