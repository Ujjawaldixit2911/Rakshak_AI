import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from main import app, route_cache

@pytest.mark.asyncio
async def test_standalone_route_calculate():
    await route_cache.clear()
    mock_osrm = {
        "code": "Ok",
        "routes": [
            {
                "distance": 32400.0,
                "duration": 4680.0,
                "geometry": {
                    "coordinates": [[77.4538, 28.6692], [77.2090, 28.6139]]
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(status_code=200, json=lambda: mock_osrm)
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/route/calculate", json={
                "source": {"lat": 28.6692, "lng": 77.4538},
                "destination": {"lat": 28.6139, "lng": 77.2090}
            })
            assert res.status_code == 200
            data = res.json()
            assert data["distance"] == 32.4
            assert data["duration"] == 78.0
            assert len(data["geometry"]) == 2

@pytest.mark.asyncio
async def test_standalone_route_not_found():
    await route_cache.clear()
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value = AsyncMock(status_code=200, json=lambda: {"code": "NoRoute", "routes": []})
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/api/route/calculate", json={
                "source": {"lat": 28.6692, "lng": 77.4538},
                "destination": {"lat": 0.0, "lng": 0.0}
            })
            assert res.status_code == 404
            assert res.json() == {"error": "route_not_found"}
