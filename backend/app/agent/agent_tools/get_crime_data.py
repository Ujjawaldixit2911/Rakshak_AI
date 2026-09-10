"""
get_crime_data.py
Tool wrapper calling Crime Data Module REST API (/api/crimes/nearby).
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("RakshakAI.Tool.GetCrimeData")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def get_crime_data(
    latitude: float,
    longitude: float,
    radius_km: float = 2.0,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    url = f"{INTERNAL_API_BASE}/api/crimes/nearby"
    params = {
        "lat": float(latitude),
        "lng": float(longitude),
        "radiusKm": float(radius_km)
    }

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=8.0)
        should_close = True

    try:
        res = await client.get(url, params=params)
        if res.status_code == 200:
            crimes = res.json()
            return {
                "latitude": latitude,
                "longitude": longitude,
                "radiusKm": radius_km,
                "crimeCount": len(crimes),
                "crimes": crimes[:10]
            }
        else:
            return {
                "error": f"Crime data service returned status {res.status_code}",
                "latitude": latitude,
                "longitude": longitude,
                "crimeCount": 0
            }
    except Exception as e:
        logger.error("Error in get_crime_data tool: %s", e)
        return {"error": str(e), "crimeCount": 0}
    finally:
        if should_close:
            await client.aclose()
