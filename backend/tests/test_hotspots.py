"""
test_hotspots.py
Unit and integration tests for the Crime Hotspot Module.
Verifies contract:
- POST /api/hotspots/analyze -> { riskLevel, crimeCount, latitude, longitude }
- GET /api/hotspots -> [ { latitude, longitude, riskLevel, crimeCount }, ... ]
- Boundary testing:
    0-5   -> LOW
    6-15  -> MEDIUM
    16-30 -> HIGH
    30+   -> CRITICAL
- Independence test (NO DB or SQLAlchemy models imported in hotspots module)
"""

import ast
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.hotspots import classify_risk_level, hotspot_cache


# ─── Independence Test ───────────────────────────────────────────────────────────
def test_hotspot_module_independence():
    """Verify that hotspot module does NOT import database session or models."""
    with open("app/routers/hotspots.py", "r", encoding="utf-8") as f:
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
        "models", "CrimeRecord", "SOSAlert", "User", "database", "AsyncSession", "select", "sqlalchemy"
    ]
    for item in forbidden:
        assert item not in imported_modules, f"Forbidden module import '{item}' found in hotspots module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in hotspots module!"


# ─── Threshold Boundary Tests ────────────────────────────────────────────────────
def test_threshold_boundaries():
    # LOW range (0 - 5)
    assert classify_risk_level(0) == "LOW"
    assert classify_risk_level(3) == "LOW"
    assert classify_risk_level(5) == "LOW"

    # Boundary 5 vs 6 -> MEDIUM
    assert classify_risk_level(6) == "MEDIUM"
    assert classify_risk_level(10) == "MEDIUM"
    assert classify_risk_level(15) == "MEDIUM"

    # Boundary 15 vs 16 -> HIGH
    assert classify_risk_level(16) == "HIGH"
    assert classify_risk_level(25) == "HIGH"
    assert classify_risk_level(30) == "HIGH"

    # Boundary 30 vs 31 -> CRITICAL
    assert classify_risk_level(31) == "CRITICAL"
    assert classify_risk_level(50) == "CRITICAL"
    assert classify_risk_level(100) == "CRITICAL"


# ─── Custom Configurable Threshold Tests ─────────────────────────────────────────
def test_custom_threshold_tuning():
    # Tuned thresholds: low <= 2, medium <= 8, high <= 20
    assert classify_risk_level(2, low_max=2, medium_max=8, high_max=20) == "LOW"
    assert classify_risk_level(3, low_max=2, medium_max=8, high_max=20) == "MEDIUM"
    assert classify_risk_level(8, low_max=2, medium_max=8, high_max=20) == "MEDIUM"
    assert classify_risk_level(9, low_max=2, medium_max=8, high_max=20) == "HIGH"
    assert classify_risk_level(20, low_max=2, medium_max=8, high_max=20) == "HIGH"
    assert classify_risk_level(21, low_max=2, medium_max=8, high_max=20) == "CRITICAL"


# ─── Integration Tests ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_analyze_hotspot_endpoint():
    mock_crimes = [{"id": i, "crimeType": "Theft"} for i in range(27)]  # 27 crimes -> HIGH

    with patch("app.routers.hotspots.fetch_nearby_crimes_from_api", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_crimes

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/hotspots/analyze", json={
                "latitude": 28.62,
                "longitude": 77.21,
                "radiusKm": 1.0
            })
            assert res.status_code == 200
            data = res.json()
            assert data["riskLevel"] == "HIGH"
            assert data["crimeCount"] == 27
            assert data["latitude"] == 28.62
            assert data["longitude"] == 77.21


@pytest.mark.asyncio
async def test_precomputed_hotspots_endpoint_caching():
    await hotspot_cache.clear()

    mock_crimes = [{"id": 1}]  # 1 crime -> LOW

    with patch("app.routers.hotspots.fetch_nearby_crimes_from_api", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_crimes

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res1 = await ac.get("/api/hotspots")
            assert res1.status_code == 200
            data1 = res1.json()
            assert isinstance(data1, list)
            assert len(data1) > 0
            assert data1[0]["riskLevel"] == "LOW"
            initial_call_count = mock_fetch.call_count

            # Second call should hit the 6h cache
            res2 = await ac.get("/api/hotspots")
            assert res2.status_code == 200
            assert res2.json() == data1
            assert mock_fetch.call_count == initial_call_count
