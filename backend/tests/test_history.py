"""
test_history.py
Unit tests for Journey History and Role persistence endpoints.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_journey_history_flow():
    uid = f"user_hist_{uuid.uuid4().hex[:8]}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch initial history (should return demo fallback or list)
        get_res = await client.get(f"/api/history?userId={uid}")
        assert get_res.status_code == 200
        initial_list = get_res.json()
        assert isinstance(initial_list, list)
        assert len(initial_list) > 0

        # 2. Log a new completed journey
        journey_payload = {
            "userId": uid,
            "source": "Saket District Centre",
            "destination": "Cyber Hub Gurgaon",
            "sourceCoords": [28.5245, 77.2066],
            "destCoords": [28.4950, 77.0895],
            "safetyScore": 94.5,
            "routeType": "Safest",
            "distanceKm": 18.6,
            "durationMin": 36.0,
        }
        post_res = await client.post("/api/history", json=journey_payload)
        assert post_res.status_code == 201
        created = post_res.json()
        assert created["source"] == "Saket District Centre"
        assert created["destination"] == "Cyber Hub Gurgaon"
        assert created["safetyScore"] == 94.5
        assert created["userId"] == uid

        # 3. Fetch history again and verify logged journey is present
        fetch_res = await client.get(f"/api/history?userId={uid}")
        assert fetch_res.status_code == 200
        records = fetch_res.json()
        assert any(r["source"] == "Saket District Centre" for r in records)


@pytest.mark.asyncio
async def test_user_role_persistence():
    uid = f"user_role_{uuid.uuid4().hex[:8]}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Update user role to emergency responder
        role_payload = {
            "userId": uid,
            "role": "emergency"
        }
        put_res = await client.put("/api/profile/role", json=role_payload)
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["userId"] == uid
        assert data["role"] == "emergency"
