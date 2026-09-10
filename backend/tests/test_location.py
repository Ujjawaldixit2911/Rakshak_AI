"""
test_location.py
Unit and integration tests for the independent Location Module.
Verifies contract:
- POST /api/location/geocode -> { "address": str, "latitude": float, "longitude": float }
- POST /api/location/reverse-geocode -> { "address": str }
- In-memory TTL Cache
- Normalization and validation
- Module independence
"""

import ast
import time
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.location import (
    InMemoryLocationCache,
    NominatimRateLimiter,
    normalize_query,
    normalize_coords,
    location_cache,
)


# ─── Module Independence Test ───────────────────────────────────────────────────
def test_location_module_independence():
    """Verify that location module has NO imports from Route, Safety, Crime, or User models/routers."""
    with open("app/routers/location.py", "r", encoding="utf-8") as f:
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

    # Strictly forbidden modules and classes
    forbidden = [
        "models", "CrimeRecord", "SOSAlert", "User",
        "public", "police", "assistant", "agent",
        "modules_router", "platform_router", "database", "ml"
    ]
    for item in forbidden:
        assert item not in imported_modules, f"Forbidden module import '{item}' found in location module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in location module!"


# ─── Unit Tests for Helper Functions & Cache ─────────────────────────────────────
def test_normalizers():
    assert normalize_query("  Ghaziabad   UTTAR   Pradesh  ") == "ghaziabad uttar pradesh"
    assert normalize_coords(28.6692123, 77.4538999) == "28.66921,77.4539"


@pytest.mark.asyncio
async def test_in_memory_ttl_cache():
    cache = InMemoryLocationCache(ttl=1)  # 1 second TTL
    await cache.set("test_key", {"data": 123})
    
    val = await cache.get("test_key")
    assert val == {"data": 123}
    
    time.sleep(1.1)
    val_expired = await cache.get("test_key")
    assert val_expired is None


# ─── Integration Tests for Endpoints ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_geocode_endpoint_contract():
    await location_cache.clear()
    
    mock_nominatim_resp = [
        {
            "place_id": 12345,
            "lat": "28.6692",
            "lon": "77.4538",
            "display_name": "Ghaziabad, Uttar Pradesh, India"
        }
    ]
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_nominatim_resp,
            raise_for_status=lambda: None
        )
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/location/geocode", json={"query": "Ghaziabad"})
            
            assert res.status_code == 200
            data = res.json()
            assert "address" in data
            assert "latitude" in data
            assert "longitude" in data
            assert data["address"] == "Ghaziabad, Uttar Pradesh, India"
            assert pytest.approx(data["latitude"], 0.0001) == 28.6692
            assert pytest.approx(data["longitude"], 0.0001) == 77.4538

            # Second call should hit the cache (mock_get will NOT be called again)
            mock_get.reset_mock()
            res2 = await ac.post("/api/location/geocode", json={"query": "Ghaziabad"})
            assert res2.status_code == 200
            assert res2.json() == data
            mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_reverse_geocode_endpoint_contract():
    await location_cache.clear()
    
    mock_nominatim_resp = {
        "place_id": 67890,
        "lat": "28.6692",
        "lon": "77.4538",
        "display_name": "Ghaziabad, Uttar Pradesh, India"
    }
    
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(
            status_code=200,
            json=lambda: mock_nominatim_resp,
            raise_for_status=lambda: None
        )
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/location/reverse-geocode", json={"latitude": 28.6692, "longitude": 77.4538})
            
            assert res.status_code == 200
            data = res.json()
            assert "address" in data
            assert data["address"] == "Ghaziabad, Uttar Pradesh, India"

            # Second call should hit the cache
            mock_get.reset_mock()
            res2 = await ac.post("/api/location/reverse-geocode", json={"latitude": 28.6692, "longitude": 77.4538})
            assert res2.status_code == 200
            assert res2.json() == data
            mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_geocode_validation_and_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Empty query
        res_empty = await ac.post("/api/location/geocode", json={"query": "   "})
        assert res_empty.status_code == 400

        # Location not found
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_get.return_value = AsyncMock(
                status_code=200,
                json=lambda: [],
                raise_for_status=lambda: None
            )
            res_404 = await ac.post("/api/location/geocode", json={"query": "non_existent_place_xyz987"})
            assert res_404.status_code == 404
