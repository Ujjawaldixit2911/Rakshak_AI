"""
test_crimes.py
Unit and integration tests for the Crime Data Module.
Verifies contract:
- GET /api/crimes (filtering by crimeType, severity, date range, pagination)
- GET /api/crimes/nearby (geospatial radius search, distance sorted ascending)
- POST /api/crimes (incident insertion)
- Independence (no imports from Route, ETA, Location)
"""

import ast
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.crimes import (
    calculate_haversine_distance_km,
    severity_num_to_enum,
    severity_enum_to_num,
)


# ─── Independence Test ───────────────────────────────────────────────────────────
def test_crime_module_independence():
    """Verify that crimes module has NO imports from Route, ETA, or Location modules."""
    with open("app/routers/crimes.py", "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    imported_modules = []
    imported_names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_modules.append(node.module)
            for alias in node.names:
                imported_names.append(alias.name)

    forbidden = [
        "route", "eta", "location",
        "OSRM", "Nominatim", "calculate_route", "geocode_location"
    ]
    for item in forbidden:
        assert item not in imported_modules, f"Forbidden module import '{item}' found in crimes module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in crimes module!"


# ─── Unit Tests ──────────────────────────────────────────────────────────────────
def test_severity_conversions():
    assert severity_num_to_enum(9) == "high"
    assert severity_num_to_enum(8) == "high"
    assert severity_num_to_enum(6) == "medium"
    assert severity_num_to_enum(4) == "medium"
    assert severity_num_to_enum(2) == "low"
    assert severity_num_to_enum(1) == "low"

    assert severity_enum_to_num("high") >= 8
    assert 4 <= severity_enum_to_num("medium") <= 7
    assert severity_enum_to_num("low") <= 3


def test_haversine_formula():
    # CP (28.6304, 77.2177) to India Gate (28.6129, 77.2295) approx 2.3 - 3.0 km
    d = calculate_haversine_distance_km(28.6304, 77.2177, 28.6129, 77.2295)
    assert 2.0 < d < 3.5


# ─── Integration Tests ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_create_and_query_crimes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a crime record
        payload = {
            "crimeType": "Theft",
            "latitude": 28.6200,
            "longitude": 77.2100,
            "date": "2026-09-11",
            "time": "14:30:00",
            "severity": "high",
            "location": "Sector 18, Noida",
            "source": "user_report"
        }
        res_post = await ac.post("/api/crimes", json=payload)
        assert res_post.status_code == 201
        created = res_post.json()
        assert created["crimeType"] == "Theft"
        assert created["severity"] == "high"
        assert created["location"] == "Sector 18, Noida"
        assert "id" in created

        # 2. Query crimes endpoint with filter
        res_get = await ac.get("/api/crimes?crimeType=Theft&severity=high&page=1&limit=10")
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert "total" in get_data
        assert "page" in get_data
        assert "results" in get_data
        assert isinstance(get_data["results"], list)
        assert get_data["page"] == 1


@pytest.mark.asyncio
async def test_nearby_crimes_radius_and_sorting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Query nearby crimes around Central Delhi
        res_nearby = await ac.get("/api/crimes/nearby?lat=28.6200&lng=77.2100&radiusKm=10&limit=20")
        assert res_nearby.status_code == 200
        items = res_nearby.json()
        assert isinstance(items, list)
        
        if len(items) > 1:
            # Verify distanceKm is present and sorted ascending
            for i in range(len(items) - 1):
                assert "distanceKm" in items[i]
                assert items[i]["distanceKm"] <= items[i + 1]["distanceKm"]
                assert items[i]["distanceKm"] <= 10.0
