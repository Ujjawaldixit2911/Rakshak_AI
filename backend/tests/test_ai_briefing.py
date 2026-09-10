"""
test_ai_briefing.py
Unit and integration tests for AI Safety Briefing Module.
Tests:
1. Module independence (AST check).
2. Deterministic fallback template generation.
3. Prompt formatting and anti-hallucination template structure.
4. POST /api/ai/briefing endpoint with fallback.
5. POST /api/ai/briefing endpoint with mocked LLM response.
"""
import ast
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.ai_briefing.prompt_templates import SYSTEM_PROMPT, format_briefing_user_prompt
from app.ai_briefing.fallback_generator import generate_fallback_briefing


def test_ai_briefing_module_independence():
    """
    Validates that ai_briefing.py does NOT import Route, Crime, Location, or User tables directly.
    """
    file_path = Path(__file__).resolve().parent.parent / "app" / "routers" / "ai_briefing.py"
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


def test_prompt_template_anti_hallucination():
    """Verifies that the system prompt explicitly forbids hallucination and calculation."""
    assert "NEVER compute, recalculate, or guess" in SYSTEM_PROMPT
    assert "DO NOT invent or fabricate crime incidents" in SYSTEM_PROMPT

    sample_data = {
        "distance": 12.5,
        "duration": 25,
        "safetyScore": 85,
        "hotspots": 0,
        "highRiskSegments": 0
    }
    user_prompt = format_briefing_user_prompt(sample_data)
    assert "12.5" in user_prompt
    assert "85" in user_prompt


def test_fallback_briefing_generation():
    """Tests deterministic fallback summary builder."""
    payload = {
        "distance": 14.2,
        "duration": 38,
        "safetyScore": 58,
        "hotspots": 2,
        "highRiskSegments": 1,
        "alternative": {
            "type": "safest",
            "duration": 44,
            "safetyScore": 94
        }
    }
    summary = generate_fallback_briefing(payload)
    assert "14.2 km" in summary
    assert "38 minutes" in summary
    assert "58/100" in summary
    assert "2 historical crime hotspots" in summary
    assert "1 high-risk segment" in summary
    assert "adds approximately 6 minute(s)" in summary
    assert "Recommendation: Safest Route" in summary


@pytest.mark.asyncio
async def test_briefing_endpoint_fallback():
    """Tests POST /api/ai/briefing when fallback is engaged."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        req_body = {
            "distance": 10.0,
            "duration": 20,
            "safetyScore": 90,
            "hotspots": 0,
            "highRiskSegments": 0
        }
        res = await client.post("/api/ai/briefing", json=req_body)
        assert res.status_code == 200
        data = res.json()
        assert "briefing" in data
        assert "10.0 km" in data["briefing"]
        assert "source" in data


@pytest.mark.asyncio
async def test_briefing_endpoint_mocked_llm():
    """Tests POST /api/ai/briefing with a mocked successful LLM call."""
    mock_llm_text = (
        "Your journey spans 14.2 km and takes 38 minutes with a moderate safety score of 58. "
        "The Safest Route adds 6 minutes but provides a 94 safety score and avoids high risk corridors.\n\n"
        "Recommendation: Safest Route"
    )

    with patch("app.ai_briefing.llm_client.call_anthropic_api", new=AsyncMock(return_value=mock_llm_text)):
        with patch("app.ai_briefing.llm_client.ANTHROPIC_API_KEY", "mock_key"):
            transport = ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                req_body = {
                    "distance": 14.2,
                    "duration": 38,
                    "safetyScore": 58,
                    "hotspots": 2,
                    "highRiskSegments": 1,
                    "alternative": {
                        "type": "safest",
                        "duration": 44,
                        "safetyScore": 94
                    }
                }
                res = await client.post("/api/ai/briefing", json=req_body)
                assert res.status_code == 200
                data = res.json()
                assert data["briefing"] == mock_llm_text
                assert data["source"] == "anthropic_claude"
