import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from main import app, calc_cost, score_route, cache

def test_standalone_cost_calc():
    c = calc_cost(duration=60.0, score=90.0, min_d=60.0, max_d=90.0)
    # norm_dur = 0.0, norm_risk = 0.10 -> 0.0*0.5 + 0.10*0.5 = 0.05
    assert pytest.approx(c, 0.001) == 0.05

@pytest.mark.asyncio
async def test_standalone_compare_routes():
    alts = [
        {"distance": 30.0, "duration": 60.0, "geometry": [[77.45, 28.66], [77.20, 28.61]]},
        {"distance": 36.0, "duration": 80.0, "geometry": [[77.45, 28.66], [77.30, 28.70], [77.20, 28.61]]}
    ]

    async def mock_fetch_alts(client, src, dst):
        return alts

    async def mock_risk(client, geom):
        if len(geom) == 2:
            return {"highRiskSegmentCount": 2, "segments": [{"crimeCount": 8}]}
        return {"highRiskSegmentCount": 0, "segments": [{"crimeCount": 0}]}

    with patch("main.fetch_alts", side_effect=mock_fetch_alts):
        with patch("main.analyze_risk", side_effect=mock_risk):
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
                assert data["fastest"]["duration"] == 60.0
                assert data["safest"]["safetyScore"] == 98.0
