"""
overpass_sync.py
OpenStreetMap Overpass API Synchronizer for Emergency POIs.
Fetches police stations, hospitals, fire stations, and pharmacies.
"""
import math
import logging
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from .models import EmergencyPOI

logger = logging.getLogger("RakshakAI.EmergencyPOI.OverpassSync")

OVERPASS_API_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

AMENITY_TYPE_MAP = {
    "police": "police",
    "hospital": "hospital",
    "fire_station": "fire_station",
    "pharmacy": "pharmacy",
}

CITY_ANCHORS = {
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bengaluru": (12.9716, 77.5946),
}

DEFAULT_SEEDED_POIS = [
    {"name": "Connaught Place Police Station", "type": "police", "latitude": 28.6328, "longitude": 77.2195, "phone": "011-23340555", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Hauz Khas Police Station", "type": "police", "latitude": 28.5482, "longitude": 77.2024, "phone": "011-26510093", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Rohini North Police Station", "type": "police", "latitude": 28.7510, "longitude": 77.0600, "phone": "011-27551000", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "AIIMS New Delhi Trauma Center", "type": "hospital", "latitude": 28.5672, "longitude": 77.2100, "phone": "011-26588500", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Safdarjung Hospital Emergency", "type": "hospital", "latitude": 28.5705, "longitude": 77.2078, "phone": "011-26165060", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Delhi Fire Service HQ Connaught Circus", "type": "fire_station", "latitude": 28.6305, "longitude": 77.2215, "phone": "101", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Prasad Nagar Fire Station", "type": "fire_station", "latitude": 28.6495, "longitude": 77.1880, "phone": "011-25785000", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "Apollo Pharmacy 24x7 Connaught Place", "type": "pharmacy", "latitude": 28.6310, "longitude": 77.2180, "phone": "011-23712345", "city": "Delhi", "source": "Overpass API (OSM)"},
    {"name": "MedPlus 24x7 Pharmacy Saket", "type": "pharmacy", "latitude": 28.5260, "longitude": 77.2120, "phone": "011-29562345", "city": "Delhi", "source": "Overpass API (OSM)"},
]

def build_overpass_query(lat: float, lon: float, radius_m: int = 10000, poi_types: Optional[List[str]] = None) -> str:
    types = poi_types or ["police", "hospital", "fire_station", "pharmacy"]
    amenities = [AMENITY_TYPE_MAP[t] for t in types if t in AMENITY_TYPE_MAP]
    amenity_regex = "|".join(amenities)

    return f"""
    [out:json][timeout:25];
    (
      node["amenity"~"^({amenity_regex})$"](around:{radius_m},{lat},{lon});
      way["amenity"~"^({amenity_regex})$"](around:{radius_m},{lat},{lon});
    );
    out center tags;
    """

async def query_overpass_api(lat: float, lon: float, radius_m: int = 10000) -> List[Dict[str, Any]]:
    query_str = build_overpass_query(lat, lon, radius_m)
    headers = {"User-Agent": "RakshakAI-EmergencyPOI/1.0"}

    for url in OVERPASS_API_URLS:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, data={"data": query_str}, headers=headers)
                if res.status_code == 200:
                    return res.json().get("elements", [])
        except Exception as e:
            logger.warning("Overpass API failed on %s: %s", url, e)

    return []

def parse_overpass_elements(elements: List[Dict[str, Any]], default_city: str = "Delhi") -> List[Dict[str, Any]]:
    parsed = []
    for elem in elements:
        tags = elem.get("tags", {})
        amenity = tags.get("amenity", "")

        poi_type = None
        if amenity == "police":
            poi_type = "police"
        elif amenity in ("hospital", "clinic"):
            poi_type = "hospital"
        elif amenity == "fire_station":
            poi_type = "fire_station"
        elif amenity == "pharmacy":
            poi_type = "pharmacy"

        if not poi_type:
            continue

        lat = elem.get("lat") or elem.get("center", {}).get("lat")
        lon = elem.get("lon") or elem.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue

        name = tags.get("name") or tags.get("name:en") or f"Emergency {poi_type.replace('_', ' ').title()}"
        phone = tags.get("contact:phone") or tags.get("phone") or tags.get("emergency:phone") or ("101" if poi_type == "fire_station" else "112")

        parsed.append({
            "name": name,
            "type": poi_type,
            "latitude": float(lat),
            "longitude": float(lon),
            "phone": phone,
            "city": default_city,
            "source": "Overpass API (OSM)",
        })
    return parsed

async def sync_emergency_pois(
    db: AsyncSession,
    city: str = "Delhi",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_km: float = 15.0,
    force_seed: bool = False
) -> Dict[str, Any]:
    center_lat, center_lon = CITY_ANCHORS.get(city, (28.6139, 77.2090))
    if lat is not None:
        center_lat = lat
    if lon is not None:
        center_lon = lon

    if not force_seed:
        raw_elements = await query_overpass_api(center_lat, center_lon, radius_m=int(radius_km * 1000))
        pois_to_insert = parse_overpass_elements(raw_elements, default_city=city)
    else:
        pois_to_insert = []

    if not pois_to_insert:
        pois_to_insert = [p for p in DEFAULT_SEEDED_POIS if p["city"].lower() == city.lower()] or DEFAULT_SEEDED_POIS

    synced_count = 0
    breakdown = {"police": 0, "hospital": 0, "fire_station": 0, "pharmacy": 0}

    for poi in pois_to_insert:
        stmt = select(EmergencyPOI).where(
            and_(
                EmergencyPOI.city == poi["city"],
                EmergencyPOI.name == poi["name"],
                EmergencyPOI.type == poi["type"]
            )
        )
        res = await db.execute(stmt)
        existing = res.scalars().first()

        if existing:
            existing.latitude = poi["latitude"]
            existing.longitude = poi["longitude"]
            existing.phone = poi.get("phone") or existing.phone
        else:
            new_poi = EmergencyPOI(
                name=poi["name"],
                type=poi["type"],
                latitude=poi["latitude"],
                longitude=poi["longitude"],
                phone=poi.get("phone"),
                city=poi.get("city", city),
                source=poi.get("source", "Overpass API (OSM)"),
            )
            db.add(new_poi)

        synced_count += 1
        t = poi.get("type", "police")
        if t in breakdown:
            breakdown[t] += 1

    await db.commit()
    return {
        "status": "success",
        "synced": synced_count,
        "city": city,
        "center": {"lat": center_lat, "lng": center_lon},
        "radiusKm": radius_km,
        "breakdown": breakdown,
    }
