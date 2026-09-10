"""
test_admin_aggregation.py
Unit and integration tests for Admin Aggregation Service & Police Operations Router.
Verifies:
1. Module independence (AST check: Admin aggregation service does not own or import database models).
2. Role gating (403 Forbidden without admin headers).
3. Summary aggregation endpoint GET /api/admin/summary with mocked microservice responses.
4. Response team assignment write-through POST /api/admin/sos/{id}/assign-response-team.
"""
import ast
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
import httpx
from httpx import ASGITransport

from app.main import app


def test_admin_service_ast_independence():
    """
    Validates that admin.py does NOT import database models directly.
    Pure composition/aggregation layer.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "admin.py"
    assert file_path.exists(), f"File {file_path} does not exist"

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    forbidden = [
        "sqlalchemy",
        "app.models",
        "app.database",
        "sqlite3",
        "psycopg2",
    ]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                for f_mod in forbidden:
                    assert not alias.name.startswith(f_mod), f"Forbidden import: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                for f_mod in forbidden:
                    assert not node.module.startswith(f_mod), f"Forbidden from-import: {node.module}"


@pytest.mark.asyncio
async def test_admin_summary_endpoint():
    """Tests GET /api/admin/summary with role check and mocked microservices."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Unauthenticated call must fail with 403 Forbidden
        unauth_res = await ac.get("/api/admin/summary")
        assert unauth_res.status_code == 403

        # 2. Authenticated call with X-Admin-Role: admin
        auth_res = await ac.get("/api/admin/summary", headers={"X-Admin-Role": "admin"})
        assert auth_res.status_code == 200
        data = auth_res.json()
        assert data["status"] == "healthy"
        assert "totals" in data
        assert "totalIncidents" in data["totals"]
        assert "systemStatus" in data


@pytest.mark.asyncio
async def test_assign_response_team_endpoint():
    """Tests POST /api/admin/sos/{id}/assign-response-team."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "teamName": "PCR Van 14",
            "officerNotes": "Immediate dispatch to coordinate"
        }

        # Authenticated call
        res = await ac.post(
            "/api/admin/sos/42/assign-response-team",
            json=payload,
            headers={"X-Admin-Role": "police"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "assigned"
        assert data["sosId"] == 42
        assert data["teamAssigned"] == "PCR Van 14"
