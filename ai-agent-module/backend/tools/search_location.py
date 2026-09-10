"""
search_location.py
Tool wrapper calling the Location Module REST API (/api/location/geocode).
"""
import os
import logging
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("RakshakAI.Tool.SearchLocation")
INTERNAL_API_BASE = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/")


async def search_location(
    query: str,
    client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Forward geocodes an address or place name via POST /api/location/geocode.
    Handles ambiguous or not found queries gracefully without touching the DB.
    """
    clean_query = query.strip()
    if not clean_query:
        return {
            "status": "AMBIGUOUS",
            "error": "Empty query provided.",
            "clarificationNeeded": True,
            "message": "Please specify a location name or address."
        }

    url = f"{INTERNAL_API_BASE}/api/location/geocode"
    payload = {"query": clean_query}

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=8.0)
        should_close = True

    try:
        res = await client.post(url, json=payload)
        if res.status_code == 200:
            data = res.json()
            return {
                "status": "SUCCESS",
                "query": clean_query,
                "address": data.get("address", clean_query),
                "latitude": float(data["latitude"]),
                "longitude": float(data["longitude"])
            }
        elif res.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "query": clean_query,
                "clarificationNeeded": True,
                "message": f"Could not locate '{clean_query}'. Could you please provide more details or an alternative landmark?"
            }
        else:
            logger.warning("Location geocode failed with HTTP %s: %s", res.status_code, res.text)
            return {
                "status": "ERROR",
                "query": clean_query,
                "error": f"Geocoding service returned status {res.status_code}"
            }
    except Exception as e:
        logger.error("Error in search_location tool: %s", e)
        return {
            "status": "ERROR",
            "query": clean_query,
            "error": str(e)
        }
    finally:
        if should_close:
            await client.aclose()
