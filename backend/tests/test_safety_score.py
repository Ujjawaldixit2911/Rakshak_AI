"""
test_safety_score.py
Unit and integration tests for the Safety Score Calculation Engine with Time-of-Day Dynamics.
Verifies:
- Time-of-day multipliers:
    06:00-19:00 -> 1.0   (baseline daytime)
    19:00-23:00 -> 0.85  (evening)
    23:00-01:00 -> 0.65  (late night)
    01:00-05:00 -> 0.55  (deep night)
    05:00-06:00 -> 0.90  (dawn transition)
- "Same location, different time" demonstration (12 PM vs 8 PM vs 1 AM)
- Backward-compatibility (omitted atTime returns baseline without regression)
- POST /api/safety-score/calculate endpoint contract
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.safety_score import get_time_multiplier, classify_score_band
from app.ml.safety_score_engine import haversine_distance, calculate_safety_score
from app.database import AsyncSessionLocal


# ─── Legacy Math Test ────────────────────────────────────────────────────────────
def test_haversine_distance():
    d = haversine_distance(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2.0 <= d <= 2.8


# ─── Multiplier Bucket Boundary Unit Tests ───────────────────────────────────────
def test_time_multiplier_bucket_boundaries():
    # 1. Daytime (06:00 to 19:00) -> 1.0
    mult, adj, _ = get_time_multiplier("2026-09-11T06:00:00+05:30")
    assert mult == 1.00
    assert adj == 0.0

    mult, adj, _ = get_time_multiplier("2026-09-11T12:30:00+05:30")
    assert mult == 1.00
    assert adj == 0.0

    mult, adj, _ = get_time_multiplier("2026-09-11T18:59:00+05:30")
    assert mult == 1.00
    assert adj == 0.0

    # 2. Evening (19:00 to 23:00) -> 0.85
    mult, adj, _ = get_time_multiplier("2026-09-11T19:00:00+05:30")
    assert mult == 0.85
    assert adj == -0.15

    mult, adj, _ = get_time_multiplier("2026-09-11T21:45:00+05:30")
    assert mult == 0.85
    assert adj == -0.15

    # 3. Late Night (23:00 to 01:00) -> 0.65
    mult, adj, _ = get_time_multiplier("2026-09-11T23:00:00+05:30")
    assert mult == 0.65
    assert adj == -0.35

    mult, adj, _ = get_time_multiplier("2026-09-11T00:30:00+05:30")
    assert mult == 0.65
    assert adj == -0.35

    # 4. Deep Night (01:00 to 05:00) -> 0.55
    mult, adj, _ = get_time_multiplier("2026-09-11T01:00:00+05:30")
    assert mult == 0.55
    assert adj == -0.45

    mult, adj, _ = get_time_multiplier("2026-09-11T03:30:00+05:30")
    assert mult == 0.55
    assert adj == -0.45

    # 5. Dawn Transition (05:00 to 06:00) -> 0.90
    mult, adj, _ = get_time_multiplier("2026-09-11T05:15:00+05:30")
    assert mult == 0.90
    assert adj == -0.10


def test_backward_compatibility_omitted_at_time():
    mult, adj, label = get_time_multiplier(None)
    assert mult == 1.0
    assert adj == 0.0


# ─── Same Route, Different Time Demonstration ────────────────────────────────────
@pytest.mark.asyncio
async def test_same_location_different_time_scenario():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        base_request = {
            "baseSafetyScore": 80.0,
            "segments": [
                {"segmentIndex": 0, "riskLevel": "LOW", "crimeCount": 0}
            ]
        }

        # Scenario A: Noon (12:00 PM) -> Daytime Baseline (80 * 1.0 = 80 -> High)
        res_noon = await ac.post("/api/safety-score/calculate", json={
            **base_request,
            "atTime": "2026-09-11T12:00:00+05:30"
        })
        assert res_noon.status_code == 200
        data_noon = res_noon.json()
        assert data_noon["safetyScore"] == 80.0
        assert data_noon["band"] == "High"
        assert data_noon["timeAdjustment"] == 0.0

        # Scenario B: Evening (08:00 PM / 20:00) -> Evening Multiplier 0.85 (80 * 0.85 = 68 -> Medium)
        res_evening = await ac.post("/api/safety-score/calculate", json={
            **base_request,
            "atTime": "2026-09-11T20:00:00+05:30"
        })
        assert res_evening.status_code == 200
        data_evening = res_evening.json()
        assert data_evening["safetyScore"] == 68.0
        assert data_evening["band"] == "Medium"
        assert data_evening["timeAdjustment"] == -0.15

        # Scenario C: Late Night (11:00 PM / 23:00) -> Late Night Multiplier 0.65 (80 * 0.65 = 52 -> Medium)
        res_late_night = await ac.post("/api/safety-score/calculate", json={
            **base_request,
            "atTime": "2026-09-11T23:00:00+05:30"
        })
        assert res_late_night.status_code == 200
        data_late_night = res_late_night.json()
        assert data_late_night["safetyScore"] == 52.0
        assert data_late_night["band"] == "Medium"
        assert data_late_night["timeAdjustment"] == -0.35

        # Scenario D: Deep Night (01:00 AM) -> Deep Night Multiplier 0.55 (80 * 0.55 = 44 -> Low)
        res_deep_night = await ac.post("/api/safety-score/calculate", json={
            **base_request,
            "atTime": "2026-09-11T01:00:00+05:30"
        })
        assert res_deep_night.status_code == 200
        data_deep_night = res_deep_night.json()
        assert data_deep_night["safetyScore"] == 44.0
        assert data_deep_night["band"] == "Low"
        assert data_deep_night["timeAdjustment"] == -0.45


@pytest.mark.asyncio
async def test_calculate_endpoint_backward_compatibility():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Omitting atTime must not fail and should yield baseline
        res = await ac.post("/api/safety-score/calculate", json={
            "baseSafetyScore": 85.0
        })
        assert res.status_code == 200
        data = res.json()
        assert data["safetyScore"] == 85.0
        assert data["timeMultiplier"] == 1.0
        assert data["timeAdjustment"] == 0.0
        assert data["band"] == "High"
