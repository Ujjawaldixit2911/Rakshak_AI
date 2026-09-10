"""
get_nearby_emergency_services.py
Tool wrapper calling the Emergency POI Module REST API (/api/emergency/nearby).
"""
import os
import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger("RakshakAI.Tool.NearbyEmergencyServices")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def get_nearby_emergency_services(
    latitude: float,
    longitude: float,
    radius_km: float = 3.0,
    service_type: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Fetches nearby emergency facilities (police, hospital, fire_station, pharmacy)
    from GET /api/emergency/nearby.
    """
    url = f"{INTERNAL_API_BASE}/api/emergency/nearby"
    params = {
        "lat": float(latitude),
        "lng": float(longitude),
        "radiusKm": float(radius_km),
        "limit": 10
    }
    if service_type:
        params["type"] = service_type.lower().strip()

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=8.0)
        should_close = True

    try:
        res = await client.get(url, params=params)
        if res.status_code == 200:
            pois = res.json()
            return {
                "latitude": latitude,
                "longitude": longitude,
                "radiusKm": radius_km,
                "serviceType": service_type or "all",
                "count": len(pois),
                "facilities": pois
            }
        else:
            return {
                "error": f"Emergency POI service returned status {res.status_code}",
                "count": 0,
                "facilities": []
            }
    except Exception as e:
        logger.error("Error in get_nearby_emergency_services tool: %s", e)
        return {"error": str(e), "count": 0, "facilities": []}
    finally:
        if should_close:
            await client.aclose()
