"""
test_agent.py
Unit tests for Rakshak AI Multi-Agent Architecture (Supervisor, Sub-agents, Tools, Guardrails).
"""
import pytest
from app.agent.tools import (
    haversine_km,
    find_nearby_police,
    find_nearby_hospital,
    get_current_location,
    fill_form
)
from app.agent.supervisor import SupervisorAgent
from app.database import AsyncSessionLocal


def test_haversine_and_poi_tools():
    # CP coords: 28.6315, 77.2167
    dist = haversine_km(28.6315, 77.2167, 28.5245, 77.2066)
    assert dist > 10.0 and dist < 15.0

    police = find_nearby_police(28.6315, 77.2167, "Delhi")
    assert len(police) > 0
    assert "name" in police[0]

    hospitals = find_nearby_hospital(28.6315, 77.2167, "Delhi")
    assert len(hospitals) > 0


def test_fill_form_structured_extraction():
    res = fill_form(
        intent="create_crime_report",
        extracted_fields={"crimeType": "Theft", "location": "Connaught Place"},
        required_fields=["crimeType", "location", "description"]
    )
    assert res["is_complete"] is False
    assert "description" in res["missing_fields"]


@pytest.mark.asyncio
async def test_supervisor_agent_routing():
    async with AsyncSessionLocal() as session:
        # 1. Test Route Reasoning query
        res = await SupervisorAgent.process_user_query(
            db=session,
            message="Safest route from CP to Saket at 10 PM night",
            city="Delhi"
        )
        assert res["action"] == "SET_ROUTE"
        assert "tool_audit_log" in res
        assert len(res["tool_audit_log"]) > 0

        # 2. Test SOS Confirmation Gating (Safety Guardrail)
        sos_res = await SupervisorAgent.process_user_query(
            db=session,
            message="Urgent SOS emergency help!",
            city="Delhi"
        )
        assert sos_res["action"] == "SHOW_SOS_CONFIRMATION"

        # 3. Test Unverified Rumor Handling (Safety Guardrail)
        rumor_res = await SupervisorAgent.process_user_query(
            db=session,
            message="WhatsApp forwarded rumor suna hai crime in Rohini",
            city="Delhi"
        )
        assert "Unverified" in rumor_res["response"] or "rumor" in rumor_res["response"].lower()
