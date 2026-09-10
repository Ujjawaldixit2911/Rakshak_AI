import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from main import app, cache

@pytest.mark.asyncio
async def test_standalone_route_risk_analyze():
    geom = [[77.4538, 28.6692], [77.3000, 28.6400], [77.2090, 28.6139]]
    
    mock_responses = [
        {"segmentIndex": 0, "riskLevel": "LOW", "crimeCount": 1, "startPoint": [77.4538, 28.6692], "endPoint": [77.3000, 28.6400], "midPoint": [77.37, 28.65]},
        {"segmentIndex": 1, "riskLevel": "HIGH", "crimeCount": 18, "startPoint": [77.3000, 28.6400], "endPoint": [77.2090, 28.6139], "midPoint": [77.25, 28.62]}
    ]

    async def mock_query(client, seg, radius_km):
        idx = seg["segmentIndex"]
        return {**seg, "riskLevel": mock_responses[idx % 2]["riskLevel"], "crimeCount": mock_responses[idx % 2]["crimeCount"]}

    with patch("main.query_hotspot", side_effect=mock_query):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/risk/analyze-route", json={"geometry": geom, "segmentLengthKm": 15.0})
            assert res.status_code == 200
            data = res.json()
            assert "segments" in data
            assert len(data["segments"]) == 2
            assert data["highRiskSegmentCount"] == 1
            assert data["overallRisk"] == "HIGH"
