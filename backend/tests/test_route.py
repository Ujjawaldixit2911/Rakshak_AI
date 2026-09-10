"""
test_route.py
Unit and integration tests for the independent Route Module.
Verifies contract:
- POST /api/route/calculate -> { "distance": km, "duration": min, "geometry": [[lng, lat], ...] }
- Error handling: { "error": "route_not_found" }
- Unit conversions (meters -> km, seconds -> minutes)
- In-memory route caching
- Module independence (no imports from Location, Safety, Crime, User)
"""

import ast
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.route import (
    InMemoryRouteCache,
    make_cache_key,
    route_cache,
)


# ─── Module Independence Test ───────────────────────────────────────────────────
def test_route_module_independence():
    """Verify that route module has NO imports from Location, Safety, Crime, or User models/routers."""
    with open("app/routers/route.py", "r", encoding="utf-8") as f:
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
        "models", "CrimeRecord", "SOSAlert", "User",
        "location", "safety", "crime",
        "public", "police", "assistant", "agent",
        "modules_router", "platform_router", "database", "ml"
    ]
    for item in forbidden:
        assert item not in imported_modules, f"Forbidden module import '{item}' found in route module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in route module!"


# ─── Unit Tests for Helper Functions & Cache ─────────────────────────────────────
def test_make_cache_key():
    key = make_cache_key(28.669211, 77.453899, 28.613911, 77.209022)
    assert key == "28.66921,77.4539->28.61391,77.20902"


@pytest.mark.asyncio
async def test_in_memory_route_cache():
    cache = InMemoryRouteCache(ttl=10)
    await cache.set("k1", {"distance": 10.5, "duration": 15})
    
    val = await cache.get("k1")
    assert val == {"distance": 10.5, "duration": 15}
    assert await cache.get("non_existent") is None


# ─── Integration Tests for Route Endpoint ─────────────────────────────────────────
@pytest.mark.asyncio
async def test_calculate_route_success():
    await route_cache.clear()
    
    mock_osrm_response = {
        "code": "Ok",
        "routes": [
            {
                "distance": 32450.0,  # meters -> 32.45 km
                "duration": 4680.0,   # seconds -> 78.0 minutes
                "geometry": {
                    "coordinates": [
                        [77.4538, 28.6692],
                        [77.3000, 28.6400],
                        [77.2090, 28.6139]
                    ],
                    "type": "LineString"
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_osrm_response
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "source": {"lat": 28.6692, "lng": 77.4538},
                "destination": {"lat": 28.6139, "lng": 77.2090}
            }
            res = await ac.post("/api/route/calculate", json=payload)
            
            assert res.status_code == 200
            data = res.json()
            assert "distance" in data
            assert "duration" in data
            assert "geometry" in data
            assert data["distance"] == 32.45
            assert data["duration"] == 78.0
            assert len(data["geometry"]) == 3
            assert data["geometry"][0] == [77.4538, 28.6692]
            assert "eta" in data

            # Verify caching: second identical request does not invoke mock_get
            mock_get.reset_mock()
            res2 = await ac.post("/api/route/calculate", json=payload)
            assert res2.status_code == 200
            assert res2.json()["distance"] == 32.45
            mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_calculate_route_not_found_error_shape():
    await route_cache.clear()

    # Case 1: OSRM returns code != Ok
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(
            status_code=200,
            json=lambda: {"code": "NoRoute", "routes": []}
        )
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            payload = {
                "source": {"lat": 28.6692, "lng": 77.4538},
                "destination": {"lat": 0.0, "lng": 0.0}
            }
            res = await ac.post("/api/route/calculate", json=payload)
            assert res.status_code == 404
            assert res.json() == {"error": "route_not_found"}

    # Case 2: OSRM returns HTTP 500 or timeout
    with patch("httpx.AsyncClient.get", side_effect=Exception("OSRM server down")):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res_err = await ac.post("/api/route/calculate", json=payload)
            assert res_err.status_code == 404
            assert res_err.json() == {"error": "route_not_found"}
