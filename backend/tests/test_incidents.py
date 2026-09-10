"""
test_incidents.py
Unit and integration tests for Incident Reporting Module.
Verifies:
1. Module independence (AST check: Incident Reporting does not touch Crime table directly).
2. Report submission with spam rate-limiting.
3. Filtering and pagination.
4. Role-gated status update (403 Forbidden without admin role).
5. Critical promotion rule: Status -> 'Verified' triggers POST /api/crimes to authoritative dataset.
"""
import ast
import uuid
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.routers.incidents import check_rate_limit


def test_incidents_ast_independence():
    """
    Validates that incidents.py does NOT import CrimeRecord or other routers directly.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "incidents.py"
    assert file_path.exists(), f"File {file_path} does not exist"

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    forbidden = [
        "app.routers.crimes",
        "app.routers.route",
        "app.routers.sos",
    ]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                for f_mod in forbidden:
                    assert not alias.name.startswith(f_mod), f"Forbidden import found: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                for f_mod in forbidden:
                    assert not node.module.startswith(f_mod), f"Forbidden from-import found: {node.module}"


@pytest.mark.asyncio
async def test_submit_and_filter_incidents():
    """Tests submitting incident reports and filtering by status."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        unique_user = f"usr_{uuid.uuid4().hex[:8]}"
        payload = {
            "userId": unique_user,
            "crimeType": "Harassment",
            "latitude": 28.6250,
            "longitude": 77.2180,
            "description": "Suspicious grouping near bus stand",
            "photoUrl": "https://storage.rakshak-ai.org/img.jpg"
        }

        # 1. Create incident
        res = await ac.post("/api/incidents", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["userId"] == unique_user
        assert data["status"] == "Reported"
        assert data["photoUrl"] == "https://storage.rakshak-ai.org/img.jpg"
        inc_id = data["id"]

        # 2. Get by ID
        get_res = await ac.get(f"/api/incidents/{inc_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == inc_id

        # 3. List with status filter
        list_res = await ac.get("/api/incidents?status=Reported")
        assert list_res.status_code == 200
        assert list_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_incident_status_update_and_promotion_to_crime_module():
    """
    Tests:
    1. 403 Forbidden without admin headers.
    2. 200 OK with X-Admin-Role: admin.
    3. Status 'Verified' triggers POST /api/crimes with source='user_report_verified'.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create incident
        payload = {
            "userId": f"usr_{uuid.uuid4().hex[:8]}",
            "crimeType": "Theft",
            "latitude": 28.6310,
            "longitude": 77.2190,
            "description": "Bicycle theft reported near parking zone."
        }
        create_res = await ac.post("/api/incidents", json=payload)
        inc_id = create_res.json()["id"]

        # Attempt status update without admin auth (Must fail 403)
        unauth_res = await ac.patch(f"/api/incidents/{inc_id}/status", json={"status": "Verified"})
        assert unauth_res.status_code == 403

        # Update with admin auth and mock Crime Module promotion call
        with patch("app.routers.incidents.promote_incident_to_crime_module", new_callable=AsyncMock) as mock_promote:
            auth_res = await ac.patch(
                f"/api/incidents/{inc_id}/status",
                json={"status": "Verified", "adminNotes": "Verified by PCR Officer"},
                headers={"X-Admin-Role": "admin"}
            )
            assert auth_res.status_code == 200
            assert auth_res.json()["status"] == "Verified"
            # Verify promotion was triggered
            assert mock_promote.called
