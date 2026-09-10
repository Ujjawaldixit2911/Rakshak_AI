"""
test_simulator.py
Unit and integration tests for What-If Simulator Module.
Verifies:
1. Module independence (AST check: Simulator NEVER touches database directly).
2. Scenario factor multipliers (travelMode, lightingCondition, weatherCondition, policePatrol, departureTime).
3. Impact breakdown formatting and AI recommendations.
4. FastAPI endpoint POST /api/simulator/what-if with mocked downstream route compare responses.
"""
import ast
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.routers.simulator import calculate_scenario_multiplier, ScenarioParameters, classify_band


def test_simulator_ast_independence():
    """
    Validates that simulator.py does NOT import SQLAlchemy, models, or database directly.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "simulator.py"
    assert file_path.exists(), f"File {file_path} does not exist"

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    forbidden_modules = [
        "sqlalchemy",
        "app.models",
        "app.database",
        "sqlite3",
        "psycopg2",
    ]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                for forbidden in forbidden_modules:
                    assert not alias.name.startswith(forbidden), f"Forbidden import: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                for forbidden in forbidden_modules:
                    assert not node.module.startswith(forbidden), f"Forbidden from-import: {node.module}"


def test_scenario_multiplier_calculations():
    """Tests compound multiplier calculation across various parameter combinations."""
    # Test 1: High risk scenario (Walking + Poor Lighting + Heavy Rain + Reduced Patrol)
    scenario_high_risk = ScenarioParameters(
        travelMode="walking",         # 0.78
        lightingCondition="poor",      # 0.82
        weatherCondition="heavy_rain", # 0.86
        policePatrol="reduced"        # 0.88
    )
    mult, factors = calculate_scenario_multiplier(scenario_high_risk)
    expected_mult = 0.78 * 0.82 * 0.86 * 0.88
    assert abs(mult - expected_mult) < 0.001
    assert len(factors) == 4
    assert any(f.factor == "Travel Mode" and f.impactPercent < 0 for f in factors)

    # Test 2: Favorable scenario (Driving + Well Lit + Clear + Enhanced Patrol)
    scenario_favorable = ScenarioParameters(
        travelMode="driving",
        lightingCondition="well_lit",
        weatherCondition="clear",
        policePatrol="enhanced"
    )
    mult_fav, factors_fav = calculate_scenario_multiplier(scenario_favorable)
    expected_fav = 1.00 * 1.05 * 1.00 * 1.15
    assert abs(mult_fav - expected_fav) < 0.001
    assert mult_fav > 1.0


def test_risk_band_classification():
    """Tests risk band classifier."""
    assert classify_band(92.0) == "High"
    assert classify_band(65.0) == "Medium"
    assert classify_band(38.0) == "Low"


@pytest.mark.asyncio
async def test_fastapi_simulator_what_if_endpoint():
    """
    Tests live invocation of POST /api/simulator/what-if on FastAPI app.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "source": {"lat": 28.6692, "lng": 77.4538},
            "destination": {"lat": 28.5355, "lng": 77.3910},
            "scenario": {
                "departureTime": "2026-09-11T23:30:00+05:30",
                "travelMode": "walking",
                "lightingCondition": "poor",
                "weatherCondition": "heavy_rain",
                "policePatrol": "standard"
            }
        }

        # Mock downstream route compare call for instant test execution
        mock_route_compare = {
            "safest": {"distance": 21.0, "duration": 40.0, "safetyScore": 90.0, "geometry": []},
            "fastest": {"distance": 18.2, "duration": 34.0, "safetyScore": 60.0, "geometry": []},
            "balanced": {"distance": 19.5, "duration": 36.0, "safetyScore": 80.0, "geometry": []},
            "evaluatedAlternativesCount": 3
        }

        # Use custom side effect to only mock downstream route compare calls
        orig_post = httpx.AsyncClient.post

        async def conditional_post(self_client, url, *args, **kwargs):
            if "api/routes/compare" in str(url):
                return httpx.Response(200, json=mock_route_compare, request=httpx.Request("POST", str(url)))
            return await orig_post(self_client, url, *args, **kwargs)

        with patch.object(httpx.AsyncClient, "post", new=conditional_post):
            response = await ac.post("/api/simulator/what-if", json=payload)

            assert response.status_code == 200
            data = response.json()
            assert "baselineScore" in data
            assert "simulatedScore" in data
            assert "scoreDelta" in data
            assert "factors" in data
            assert "aiRecommendation" in data
            assert data["scoreDelta"] < 0
            assert len(data["factors"]) >= 5
