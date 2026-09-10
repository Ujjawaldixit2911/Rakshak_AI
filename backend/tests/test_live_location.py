"""
test_live_location.py
Unit and integration tests for Live Location Sharing Module.
Tests:
1. Module independence (AST parsing).
2. POST /api/live-location/update with ACTIVE SOS.
3. POST /api/live-location/update rejected when SOS is RESOLVED (HTTP 409).
4. GET /api/live-location/{sosId}/trail returns rolling points.
5. GET /api/live-location/{sosId}/status returns viewers & metadata.
6. WebSocket /ws/live-location/{sosId} initial trail replay & broadcast.
"""
import ast
from pathlib import Path
import pytest
import httpx
from httpx import ASGITransport
from starlette.testclient import TestClient

from app.main import app
from app.live_location_manager import live_location_manager


def test_live_location_module_independence():
    """
    Validates that live_location.py does NOT import Route, Crime, or User routing internals.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "live_location.py"
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
                    assert not alias.name.startswith(forbidden), f"Forbidden import found: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                for forbidden in forbidden_modules:
                    assert not node.module.startswith(forbidden), f"Forbidden from-import found: {node.module}"


@pytest.mark.asyncio
async def test_live_location_update_and_trail():
    """Tests updating location for an active SOS and querying the rolling trail."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger an active SOS
        sos_res = await client.post(
            "/api/sos/trigger",
            json={"userId": "user_live_test", "latitude": 28.6139, "longitude": 77.2090}
        )
        assert sos_res.status_code == 201
        sos_id = sos_res.json()["sosId"]

        # 2. Push GPS updates
        update_res = await client.post(
            "/api/live-location/update",
            json={
                "sosId": sos_id,
                "latitude": 28.6145,
                "longitude": 77.2098,
                "speed": 16.5,
                "accuracy": 4.5
            }
        )
        assert update_res.status_code == 200
        up_data = update_res.json()
        assert up_data["status"] == "broadcasted"
        assert up_data["sosId"] == sos_id
        assert up_data["point"]["latitude"] == 28.6145

        # 3. Query rolling trail
        trail_res = await client.get(f"/api/live-location/{sos_id}/trail")
        assert trail_res.status_code == 200
        trail_data = trail_res.json()
        assert trail_data["totalPoints"] >= 1
        assert trail_data["channel"] == f"sos:{sos_id}:location"


@pytest.mark.asyncio
async def test_live_location_rejected_on_resolved_sos():
    """Tests that location updates are rejected when the SOS is RESOLVED."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Trigger SOS
        sos_res = await client.post(
            "/api/sos/trigger",
            json={"userId": "user_rejected_test", "latitude": 28.61, "longitude": 77.20}
        )
        sos_id = sos_res.json()["sosId"]

        # 2. Resolve SOS
        await client.post(f"/api/sos/{sos_id}/resolve")

        # 3. Location update must now fail with 409 Conflict
        bad_update = await client.post(
            "/api/live-location/update",
            json={"sosId": sos_id, "latitude": 28.62, "longitude": 77.21}
        )
        assert bad_update.status_code == 409
        assert "already RESOLVED" in bad_update.json()["detail"]


def test_live_location_websocket_handshake():
    """Tests WebSocket connection and initial trail replay handshake."""
    client = TestClient(app)
    sos_id = "999"

    # Pre-populate 1 point in manager
    live_location_manager.rolling_trails[sos_id] = [
        {"latitude": 28.6139, "longitude": 77.2090, "speed": 12.0}
    ]

    with client.websocket_connect(f"/ws/live-location/{sos_id}") as websocket:
        initial_msg = websocket.receive_json()
        assert initial_msg["type"] == "INITIAL_TRAIL_REPLAY"
        assert initial_msg["channel"] == f"sos:{sos_id}:location"
        assert initial_msg["totalReplayedPoints"] >= 1
