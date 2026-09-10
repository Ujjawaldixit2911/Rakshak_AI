"""
test_eta.py
Unit and integration tests for the independent ETA Module.
Verifies contract:
- POST /api/eta/calculate -> duration_minutes, formatted_duration, eta_iso, eta_formatted
- Timezone offsets & 12h/24h formats
- Negative duration error handling
- Independence (no imports from Route, Location, Crime, Safety, User)
"""

import ast
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.eta import format_duration_string, parse_departure_time


# ─── Independence Test ───────────────────────────────────────────────────────────
def test_eta_module_independence():
    """Verify that ETA module has NO imports from Route, Location, Safety, Crime, or User models/routers."""
    with open("app/routers/eta.py", "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    imported_modules = []
    imported_names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_modules.append(node.module)
            for alias in node.names:
                imported_names.append(alias.name)

    forbidden = [
        "models", "CrimeRecord", "SOSAlert", "User",
        "route", "location", "safety", "crime",
        "public", "police", "assistant", "agent",
        "modules_router", "platform_router", "database", "ml"
    ]
    for item in forbidden:
        assert item not in imported_modules, f"Forbidden module import '{item}' found in eta module!"
        assert item not in imported_names, f"Forbidden symbol import '{item}' found in eta module!"


# ─── Unit Tests ──────────────────────────────────────────────────────────────────
def test_format_duration_string():
    assert format_duration_string(0) == "< 1 min"
    assert format_duration_string(14) == "14 min"
    assert format_duration_string(60) == "1 hr"
    assert format_duration_string(78) == "1 hr 18 min"
    assert format_duration_string(120) == "2 hrs"
    assert format_duration_string(135) == "2 hrs 15 min"


@pytest.mark.asyncio
async def test_calculate_eta_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "duration": 78,
            "departure_time": "2026-09-11T10:00:00Z",
            "timezone_offset_minutes": 330,  # IST (UTC+5:30)
            "format_24h": False
        }
        res = await ac.post("/api/eta/calculate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["duration_minutes"] == 78.0
        assert data["formatted_duration"] == "1 hr 18 min"
        assert data["departure_time"] == "2026-09-11T10:00:00+00:00"
        assert data["eta_iso"] == "2026-09-11T11:18:00+00:00"
        # 11:18 UTC + 5:30 = 16:48 -> 04:48 PM
        assert data["eta_formatted"] == "04:48 PM"
        assert data["relative_eta"] == "in 1 hr 18 min"


@pytest.mark.asyncio
async def test_calculate_eta_24h_format():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "duration": 45,
            "departure_time": "2026-09-11T14:00:00Z",
            "timezone_offset_minutes": 0,
            "format_24h": True
        }
        res = await ac.post("/api/eta/calculate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["eta_formatted"] == "14:45"
        assert data["formatted_duration"] == "45 min"


@pytest.mark.asyncio
async def test_calculate_eta_negative_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/eta/calculate", json={"duration": -5})
        assert res.status_code == 422 or res.status_code == 400
