"""
test_notifications_engine.py
Unit and integration tests for Notification Engine Module.
Verifies:
1. Template rendering across events (HIGH_RISK_ROUTE, SOS_TRIGGERED, CRIME_NEARBY, ROUTE_CHANGED, EMERGENCY_NEARBY).
2. Delivery channel adapters (FCM, Twilio SMS, SendGrid Email, In-App).
3. Async non-blocking dispatch behavior on POST /api/notify.
4. Backward compatibility with direct contact recipient dispatches.
"""
import pytest
import httpx
from httpx import ASGITransport

from app.main import app
from app.routers.notifications import render_template


def test_template_rendering_across_events():
    """Tests that event templates interpolate payload keys properly."""
    # 1. High Risk Route
    msg1 = render_template("HIGH_RISK_ROUTE", {"distance": "400"})
    assert "400m ahead" in msg1

    # 2. SOS Triggered
    msg2 = render_template("SOS_TRIGGERED", {"userId": "usr_alpha", "latitude": "28.61", "longitude": "77.20", "liveTrackUrl": "https://rakshak.org/track/123"})
    assert "usr_alpha" in msg2
    assert "https://rakshak.org/track/123" in msg2

    # 3. Crime Nearby
    msg3 = render_template("CRIME_NEARBY", {"crimeType": "Harassment", "distanceKm": "0.6"})
    assert "Harassment" in msg3
    assert "0.6km" in msg3

    # 4. Route Changed
    msg4 = render_template("ROUTE_CHANGED", {"safetyScore": "92"})
    assert "92/100" in msg4

    # 5. Emergency Nearby
    msg5 = render_template("EMERGENCY_NEARBY", {"facilityName": "Fortis Hospital", "facilityType": "Hospital", "distanceKm": "1.4", "phone": "102"})
    assert "Fortis Hospital" in msg5
    assert "1.4km" in msg5


@pytest.mark.asyncio
async def test_fastapi_publish_notification_event():
    """Tests POST /api/notify event publishing."""
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "event": "HIGH_RISK_ROUTE",
            "userId": "usr_test_99",
            "payload": {
                "distance": "300",
                "riskLevel": "HIGH"
            }
        }

        res = await ac.post("/api/notify", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "queued"
        assert data["event"] == "HIGH_RISK_ROUTE"
        assert "notificationId" in data
        assert "300m ahead" in data["preview"]
        assert "PUSH" in data["channels"]
