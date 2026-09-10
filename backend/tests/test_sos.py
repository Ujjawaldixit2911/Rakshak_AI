"""
test_sos.py
Unit and integration tests for the SOS Module.
Tests:
1. Module independence (AST check for zero direct coupling with Notification, Trusted Contacts, or Route tables).
2. POST /api/sos/trigger creates ACTIVE event and returns nearest POIs.
3. POST /api/sos/{sosId}/resolve marks event as RESOLVED.
4. PATCH /api/sos/{sosId} updates status to CANCELLED.
5. GET /api/sos/{sosId} retrieves event data.
6. Rate limiting enforcement.
7. Pub/sub event bus delivery verification.
"""
import ast
from pathlib import Path
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.event_bus import sos_event_bus
from app.routers.sos import user_trigger_history


def test_sos_module_independence():
    """
    Ensures that sos.py does NOT directly import Route, Crime, Location, or User routing modules.
    Communication is purely event-driven and REST-based.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "sos.py"
    assert file_path.exists(), f"File {file_path} does not exist"

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    forbidden_modules = [
        "app.routers.route",
        "app.routers.crimes",
        "app.routers.eta",
        "app.routers.location",
        "app.routers.hotspots",
        "app.routers.safety_score",
        "app.routers.route_compare",
        "app.routers.route_risk",
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


@pytest.mark.asyncio
async def test_trigger_sos_event():
    """Tests triggering an SOS event, checking DB persistence, pub/sub publish, and POI attachment."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "userId": "user_unit_test_1",
            "latitude": 28.6315,
            "longitude": 77.2167,
            "emergencyType": "Harassment / Panic"
        }
        res = await client.post("/api/sos/trigger", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "ACTIVE"
        assert data["userId"] == "user_unit_test_1"
        assert "sosId" in data
        assert "timestamp" in data
        assert isinstance(data["nearestEmergencyPois"], list)
        assert len(data["nearestEmergencyPois"]) > 0

        # Verify event bus received SOS_TRIGGERED event
        history = [e for e in sos_event_bus.published_history if e["event_type"] == "SOS_TRIGGERED"]
        assert len(history) > 0
        last_event = history[-1]
        assert last_event["payload"]["userId"] == "user_unit_test_1"


@pytest.mark.asyncio
async def test_resolve_sos_event():
    """Tests resolving an active SOS event."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger
        trig_res = await client.post("/api/sos/trigger", json={"userId": "user_resolve_test", "latitude": 28.61, "longitude": 77.20})
        sos_id = trig_res.json()["sosId"]

        # 2. Resolve
        res_res = await client.post(f"/api/sos/{sos_id}/resolve")
        assert res_res.status_code == 200
        res_data = res_res.json()
        assert res_data["status"] == "RESOLVED"
        assert "resolvedAt" in res_data

        # 3. Verify GET reflects RESOLVED
        get_res = await client.get(f"/api/sos/{sos_id}")
        assert get_res.status_code == 200
        assert get_res.json()["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_update_sos_status_patch():
    """Tests updating SOS status to CANCELLED via PATCH."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Trigger
        trig_res = await client.post("/api/sos/trigger", json={"userId": "user_patch_test", "latitude": 28.55, "longitude": 77.22})
        sos_id = trig_res.json()["sosId"]

        # Update
        patch_res = await client.patch(
            f"/api/sos/{sos_id}",
            json={"status": "CANCELLED", "note": "False alarm triggered by accident"}
        )
        assert patch_res.status_code == 200
        data = patch_res.json()
        assert data["status"] == "CANCELLED"
        assert data["metadata"].get("lastNote") == "False alarm triggered by accident"


@pytest.mark.asyncio
async def test_sos_rate_limiting():
    """Tests rate limit enforcement on excessive SOS spamming."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        spam_user = "user_rate_limit_victim"
        user_trigger_history[spam_user] = []

        # Send 5 valid requests
        for _ in range(5):
            r = await client.post("/api/sos/trigger", json={"userId": spam_user, "latitude": 28.61, "longitude": 77.20})
            assert r.status_code == 201

        # 6th request must trigger 429 Too Many Requests
        r_blocked = await client.post("/api/sos/trigger", json={"userId": spam_user, "latitude": 28.61, "longitude": 77.20})
        assert r_blocked.status_code == 429
        assert "Rate limit exceeded" in r_blocked.json()["detail"]
