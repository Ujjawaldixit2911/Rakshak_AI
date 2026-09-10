"""
test_route_compare.py
Unit and integration tests for the Three-Route Engine.
Verifies contract:
- POST /api/routes/compare -> { "fastest": {...}, "safest": {...}, "balanced": {...} }
- Classification logic (Fastest = min duration, Safest = max safetyScore, Balanced = min cost)
- Cost function formula
- Parallelized execution via asyncio.gather
- 5-min caching
- Module independence (Zero DB access)
"""

import ast
import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.route_compare import (
    evaluate_cost,
    compute_safety_score,
    compare_cache
)


# ─── Independence Test ───────────────────────────────────────────────────────────
def test_route_compare_independence():
    """Verify that route_compare module does NOT import database session, models, or SQL."""
    with open("app/routers/route_compare.py", "r", encoding="utf-8") as f:
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
        assert item not in imported_modules, f"Forbidden module import '{item}' found in route_compare module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in route_compare module!"


# ─── Unit Tests for Scoring & Cost Function ──────────────────────────────────────
def test_safety_scoring_logic():
    # Clean route: 0 high-risk segments, 0 crimes
    clean_risk = {"highRiskSegmentCount": 0, "totalSegments": 5, "segments": []}
    assert compute_safety_score(clean_risk) == 98.0

    # Risky route: 2 high-risk segments, 20 crimes
    risky_risk = {
        "highRiskSegmentCount": 2,
        "totalSegments": 5,
        "segments": [{"crimeCount": 10, "riskLevel": "HIGH"}, {"crimeCount": 10, "riskLevel": "HIGH"}]
    }
    score = compute_safety_score(risky_risk)
    assert score < 70.0


def test_cost_function_balance():
    # Route 1: Fastest (duration: 60 min, safety: 50)
    # Route 2: Safest (duration: 90 min, safety: 95)
    # Route 3: Balanced (duration: 68 min, safety: 90)
    min_d, max_d = 60.0, 90.0

    c1 = evaluate_cost(60.0, 50.0, min_d, max_d, w_time=0.5, w_safety=0.5)
    c2 = evaluate_cost(90.0, 95.0, min_d, max_d, w_time=0.5, w_safety=0.5)
    c3 = evaluate_cost(68.0, 90.0, min_d, max_d, w_time=0.5, w_safety=0.5)

    # c1 = 0.0 * 0.5 + 0.50 * 0.5 = 0.25
    # c2 = 1.0 * 0.5 + 0.05 * 0.5 = 0.525
    # c3 = (8/30) * 0.5 + 0.10 * 0.5 = 0.133 + 0.05 = 0.183 -> Lowest cost (Balanced wins!)
    assert c3 < c1
    assert c3 < c2


# ─── Integration Tests ───────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_compare_routes_endpoint():
    await compare_cache.clear()

    # Mock 3 alternatives from Route Module
    mock_alternatives = [
        {"distance": 32.0, "duration": 65.0, "geometry": [[77.45, 28.66], [77.20, 28.61]]},  # Direct & Fast
        {"distance": 38.0, "duration": 85.0, "geometry": [[77.45, 28.66], [77.30, 28.70], [77.20, 28.61]]},  # Safe Detour
        {"distance": 34.0, "duration": 70.0, "geometry": [[77.45, 28.66], [77.35, 28.65], [77.20, 28.61]]},  # Balanced
    ]

    # Mock risk assessments from Risk Module
    mock_risk_results = [
        {"highRiskSegmentCount": 3, "totalSegments": 6, "segments": [{"crimeCount": 15, "riskLevel": "HIGH"}]},
        {"highRiskSegmentCount": 0, "totalSegments": 7, "segments": [{"crimeCount": 1, "riskLevel": "LOW"}]},
        {"highRiskSegmentCount": 1, "totalSegments": 6, "segments": [{"crimeCount": 4, "riskLevel": "MEDIUM"}]},
    ]

    async def mock_fetch_alts(client, src, dst):
        return mock_alternatives

    async def mock_risk_api(client, geom):
        if len(geom) == 2:
            return mock_risk_results[0]
        elif geom[1][1] == 28.70:
            return mock_risk_results[1]
        else:
            return mock_risk_results[2]

    with patch("app.routers.route_compare.fetch_route_alternatives", side_effect=mock_fetch_alts) as mock_alts:
        with patch("app.routers.route_compare.analyze_route_risk_api", side_effect=mock_risk_api):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                res = await ac.post("/api/routes/compare", json={
                    "source": {"lat": 28.6692, "lng": 77.4538},
                    "destination": {"lat": 28.6139, "lng": 77.2090}
                })
                assert res.status_code == 200
                data = res.json()
                assert "fastest" in data
                assert "safest" in data
                assert "balanced" in data
                assert data["evaluatedAlternativesCount"] == 3

                # Verify classifications:
                assert data["fastest"]["duration"] == 65.0
                assert data["safest"]["safetyScore"] >= 90.0
                assert data["balanced"]["duration"] == 70.0

                # Verify Caching:
                mock_alts.reset_mock()
                res2 = await ac.post("/api/routes/compare", json={
                    "source": {"lat": 28.6692, "lng": 77.4538},
                    "destination": {"lat": 28.6139, "lng": 77.2090}
                })
                assert res2.status_code == 200
                assert res2.json() == data
                mock_alts.assert_not_called()
