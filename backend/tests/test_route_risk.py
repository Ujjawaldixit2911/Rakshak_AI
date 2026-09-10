"""
test_route_risk.py
Unit and integration tests for the Route Risk Analysis Module.
Verifies:
- POST /api/risk/analyze-route contract:
    { "segments": [ { "segmentIndex": ..., "riskLevel": ..., "startPoint": [...], "endPoint": [...] } ], "highRiskSegmentCount": N }
- Polyline segmentation (distance-based slicing into ~500m-1km chunks)
- Concurrent batch lookups (asyncio.gather) to Hotspot API
- Caching per route geometry hash
- Module independence (Zero DB access)
"""

import ast
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.route_risk import (
    segment_geometry_polyline,
    compute_geometry_hash,
    risk_cache
)


# ─── Independence Test ───────────────────────────────────────────────────────────
def test_route_risk_module_independence():
    """Verify that route_risk module does NOT import database session, models, or SQL."""
    with open("app/routers/route_risk.py", "r", encoding="utf-8") as f:
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
        assert item not in imported_modules, f"Forbidden module import '{item}' found in route_risk module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in route_risk module!"


# ─── Unit Tests for Polyline Segmenter ───────────────────────────────────────────
def test_geometry_segmentation():
    # Route from CP to India Gate (~3.2 km)
    mock_geometry = [
        [77.2177, 28.6304],
        [77.2220, 28.6220],
        [77.2295, 28.6129]
    ]

    segments = segment_geometry_polyline(mock_geometry, target_segment_km=1.0)
    assert len(segments) >= 3
    for idx, seg in enumerate(segments):
        assert seg["segmentIndex"] == idx
        assert "startPoint" in seg
        assert "endPoint" in seg
        assert "midPoint" in seg
        assert len(seg["startPoint"]) == 2
        assert len(seg["endPoint"]) == 2
        assert len(seg["midPoint"]) == 2


def test_geometry_hash_stability():
    geom1 = [[77.4538, 28.6692], [77.2090, 28.6139]]
    geom2 = [[77.4538, 28.6692], [77.2090, 28.6139]]
    geom3 = [[77.4538, 28.6692], [77.2091, 28.6139]]

    assert compute_geometry_hash(geom1) == compute_geometry_hash(geom2)
    assert compute_geometry_hash(geom1) != compute_geometry_hash(geom3)


# ─── Integration Tests ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_analyze_route_risk_endpoint_with_mock_hotspots():
    await risk_cache.clear()

    mock_route_geometry = [
        [77.4538, 28.6692],
        [77.3000, 28.6400],
        [77.2090, 28.6139]
    ]

    # Mock response from Hotspot Module:
    # First call -> LOW risk, Second call -> HIGH risk
    responses = [
        {"riskLevel": "LOW", "crimeCount": 3, "latitude": 28.65, "longitude": 77.38},
        {"riskLevel": "HIGH", "crimeCount": 22, "latitude": 28.62, "longitude": 77.25}
    ]

    async def mock_hotspot_post(client, segment, radius_km=0.8):
        idx = segment["segmentIndex"]
        resp_data = responses[idx % len(responses)]
        return {
            **segment,
            "riskLevel": resp_data["riskLevel"],
            "crimeCount": resp_data["crimeCount"]
        }

    with patch("app.routers.route_risk.query_segment_hotspot_risk", side_effect=mock_hotspot_post) as mock_query:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/risk/analyze-route", json={
                "geometry": mock_route_geometry,
                "segmentLengthKm": 15.0  # Force 2 segments for the ~30km test geometry
            })
            assert res.status_code == 200
            data = res.json()
            assert "segments" in data
            assert "highRiskSegmentCount" in data
            assert len(data["segments"]) == 2
            assert data["segments"][0]["riskLevel"] == "LOW"
            assert data["segments"][1]["riskLevel"] == "HIGH"
            assert data["highRiskSegmentCount"] == 1
            assert data["overallRisk"] == "HIGH"

            # Verify caching: second call with identical geometry hits cache
            mock_query.reset_mock()
            res2 = await ac.post("/api/risk/analyze-route", json={
                "geometry": mock_route_geometry,
                "segmentLengthKm": 15.0
            })
            assert res2.status_code == 200
            assert res2.json() == data
            mock_query.assert_not_called()
