"""
test_trusted_contacts.py
Unit and integration tests for Trusted Contacts Module.
Tests:
1. Module independence (AST parsing).
2. Contact creation, phone/email validation.
3. 5-contact cap per user enforcement.
4. Contact deletion.
5. Emergency notification orchestration and live-location link generation.
"""
import ast
from pathlib import Path
import pytest
import httpx
from httpx import ASGITransport

from app.main import app


def test_trusted_contacts_module_independence():
    """
    Validates that trusted_contacts.py is independent and does NOT import
    Route, Crime, Location, or User routing internals directly.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "trusted_contacts.py"
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
async def test_trusted_contact_crud():
    """Tests creating, fetching, and deleting emergency contacts."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        test_user = "user_crud_test"

        # 1. Create Contact
        create_res = await client.post(
            "/api/trusted-contacts",
            json={
                "userId": test_user,
                "name": "Sunita Sharma",
                "relationship": "Mother",
                "phone": "+91-9876543210",
                "email": "sunita@example.com"
            }
        )
        assert create_res.status_code == 201
        contact = create_res.json()
        assert contact["name"] == "Sunita Sharma"
        assert contact["phone"] == "+91-9876543210"
        contact_id = contact["id"]

        # 2. Get Contacts
        list_res = await client.get(f"/api/trusted-contacts?userId={test_user}")
        assert list_res.status_code == 200
        contacts = list_res.json()
        assert len(contacts) >= 1
        assert any(c["id"] == contact_id for c in contacts)

        # 3. Delete Contact
        del_res = await client.delete(f"/api/trusted-contacts/{contact_id}")
        assert del_res.status_code == 200

        # Verify deleted
        list_after = await client.get(f"/api/trusted-contacts?userId={test_user}")
        assert not any(c["id"] == contact_id for c in list_after.json())


@pytest.mark.asyncio
async def test_phone_and_email_validation():
    """Tests that malformed phone numbers or emails are rejected."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Invalid phone (< 10 digits)
        res_bad_phone = await client.post(
            "/api/trusted-contacts",
            json={"userId": "user_val_test", "name": "Bad Phone", "phone": "123"}
        )
        assert res_bad_phone.status_code == 422

        # Invalid email
        res_bad_email = await client.post(
            "/api/trusted-contacts",
            json={"userId": "user_val_test", "name": "Bad Email", "phone": "+91-9876543210", "email": "invalid-email"}
        )
        assert res_bad_email.status_code == 422


@pytest.mark.asyncio
async def test_max_contacts_cap():
    """Tests that a user cannot exceed 5 emergency contacts."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        import uuid
        cap_user = f"user_cap_test_{uuid.uuid4().hex[:8]}"

        # Add 5 contacts
        for i in range(5):
            res = await client.post(
                "/api/trusted-contacts",
                json={
                    "userId": cap_user,
                    "name": f"Contact #{i+1}",
                    "phone": f"+91-987654321{i}",
                    "email": f"c{i}@example.com"
                }
            )
            assert res.status_code == 201

        # 6th contact must fail with 400 Bad Request
        res_6th = await client.post(
            "/api/trusted-contacts",
            json={
                "userId": cap_user,
                "name": "Contact #6",
                "phone": "+91-9876543299"
            }
        )
        assert res_6th.status_code == 400
        assert "maximum allowed 5" in res_6th.json()["detail"]


@pytest.mark.asyncio
async def test_notify_emergency_orchestration():
    """Tests /notify-emergency calling Notification Module and building tracking link."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        notify_user = "user_notify_test"

        # Ensure at least 1 contact
        await client.post(
            "/api/trusted-contacts",
            json={
                "userId": notify_user,
                "name": "Emergency Guardian",
                "phone": "+91-9811000000",
                "email": "guardian@example.com"
            }
        )

        # Call notify-emergency
        notify_res = await client.post(
            "/api/trusted-contacts/notify-emergency",
            json={"sosId": "42", "userId": notify_user}
        )
        assert notify_res.status_code == 200
        data = notify_res.json()
        assert data["status"] == "dispatched"
        assert data["sosId"] == "42"
        assert "/track/42" in data["liveTrackUrl"]
        assert data["recipientsCount"] >= 1
        assert "notificationDispatch" in data
        assert data["notificationDispatch"]["status"] == "dispatched"
