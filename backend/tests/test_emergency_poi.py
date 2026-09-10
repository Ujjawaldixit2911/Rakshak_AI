"""
test_emergency_poi.py
Unit & Integration tests for the Emergency POI Module (Module 15).
Tests:
1. Module independence (AST analysis ensuring no forbidden cross-module imports).
2. GET /api/emergency/nearby radius query & distance sorting.
3. GET /api/emergency/nearby type filtering (police, hospital, fire_station, pharmacy).
4. Overpass QL query generation.
5. POST /api/emergency/sync trigger & seed insertion.
"""
import ast
from pathlib import Path
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.overpass_sync import build_overpass_query, parse_overpass_elements


def test_emergency_poi_module_independence():
    """
    Validates that emergency_poi.py is fully independent and does NOT import
    Route, Crime, User, or ETA module code directly.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "emergency_poi.py"
    assert file_path.exists(), f"File {file_path} does not exist"

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    forbidden_modules = [
        "app.routers.route",
        "app.routers.crimes",
        "app.routers.eta",
        "app.routers.location",
        "app.routers.hotspots",
        "app.routers.safety_score",
        "app.routers.route_compare",
        "app.routers.route_risk",
    ]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                for forbidden in forbidden_modules:
                    assert not alias.name.startswith(forbidden), f"Forbidden import found: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                for forbidden in forbidden_modules:
                    assert not node.module.startswith(forbidden), f"Forbidden from-import found: {node.module}"


def test_build_overpass_query():
    """Validates Overpass QL query formatting."""
    query = build_overpass_query(lat=28.6139, lon=77.2090, radius_m=5000, poi_types=["police", "hospital"])
    assert "node[\"amenity\"~\"^(police|hospital)$\"](around:5000,28.6139,77.209)" in query
    assert "out center tags;" in query


def test_parse_overpass_elements():
    """Validates parsing of OSM raw nodes and ways into EmergencyPOI models."""
    sample_elements = [
        {
            "type": "node",
            "id": 12345,
            "lat": 28.6328,
            "lon": 77.2195,
            "tags": {"amenity": "police", "name": "Connaught Place Police Station", "phone": "011-23340555"}
        },
        {
            "type": "way",
            "id": 67890,
            "center": {"lat": 28.5672, "lon": 77.2100},
            "tags": {"amenity": "hospital", "name": "AIIMS Apex Trauma Center", "contact:phone": "011-26588500"}
        },
        {
            "type": "node",
            "id": 11111,
            "lat": 28.6305,
            "lon": 77.2215,
            "tags": {"amenity": "fire_station", "name": "Connaught Circus Fire Station"}
        }
    ]

    parsed = parse_overpass_elements(sample_elements, default_city="Delhi")
    assert len(parsed) == 3
    assert parsed[0]["name"] == "Connaught Place Police Station"
    assert parsed[0]["type"] == "police"
    assert parsed[1]["type"] == "hospital"
    assert parsed[2]["type"] == "fire_station"
    assert parsed[2]["phone"] == "101"  # default fire emergency


@pytest.mark.asyncio
async def test_get_nearby_emergency_pois():
    """Tests GET /api/emergency/nearby for radius retrieval and distance sorting."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/emergency/nearby?lat=28.6315&lng=77.2167&radiusKm=5&limit=10")
        assert res.status_code == 200
        pois = res.json()
        assert isinstance(pois, list)
        assert len(pois) > 0

        # Verify required fields
        first = pois[0]
        assert "name" in first
        assert "type" in first
        assert "latitude" in first
        assert "longitude" in first
        assert "distanceKm" in first
        assert "source" in first

        # Verify sorted ascending by distanceKm
        distances = [p["distanceKm"] for p in pois]
        assert distances == sorted(distances)


@pytest.mark.asyncio
async def test_get_nearby_emergency_pois_type_filter():
    """Tests GET /api/emergency/nearby with type filtering."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Filter for hospitals
        res_hosp = await client.get("/api/emergency/nearby?lat=28.6315&lng=77.2167&radiusKm=10&type=hospital")
        assert res_hosp.status_code == 200
        hospitals = res_hosp.json()
        assert all(p["type"] == "hospital" for p in hospitals)

        # Filter for police
        res_pol = await client.get("/api/emergency/nearby?lat=28.6315&lng=77.2167&radiusKm=10&type=police")
        assert res_pol.status_code == 200
        police_stations = res_pol.json()
        assert all(p["type"] == "police" for p in police_stations)


@pytest.mark.asyncio
async def test_trigger_overpass_sync_endpoint():
    """Tests POST /api/emergency/sync to trigger re-syncing."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "city": "Delhi",
            "lat": 28.6139,
            "lng": 77.2090,
            "radiusKm": 10.0,
            "forceSeed": True
        }
        res = await client.post("/api/emergency/sync", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["synced"] > 0
        assert "breakdown" in data
        assert "police" in data["breakdown"]
