import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from main import app, classify_risk_level, cache

def test_standalone_thresholds():
    assert classify_risk_level(0) == "LOW"
    assert classify_risk_level(5) == "LOW"
    assert classify_risk_level(6) == "MEDIUM"
    assert classify_risk_level(15) == "MEDIUM"
    assert classify_risk_level(16) == "HIGH"
    assert classify_risk_level(30) == "HIGH"
    assert classify_risk_level(31) == "CRITICAL"

@pytest.mark.asyncio
async def test_standalone_hotspot_analyze():
    mock_crimes = [{"id": i} for i in range(27)]
    with patch("main.fetch_nearby_crimes", new_callable=AsyncMock) as mock_fetch:
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
