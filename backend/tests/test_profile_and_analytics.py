"""
test_profile_and_analytics.py
Comprehensive test suite for:
1. Personalization Layer (UserSafetyProfile, Women Safety Mode, Night Safety Mode)
2. Route Compare Module integration with profile weights forwarding
3. Analytics Module (Crime by Area, Time, Type, and Risk Trend aggregations)
4. AI Explainability (Safety Score breakdown and AI Briefing "Why?" section)
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routers.profile import compute_profile_weights, NIGHT_MODE_CONFIG
from app.routers.safety_score import SafetyScoreWeights


@pytest.mark.asyncio
async def test_profile_default_and_crud():
    import uuid
    uid = f"user_crud_{uuid.uuid4().hex[:8]}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch default profile for a brand new user
        res = await client.get(f"/api/profile/safety-settings?userId={uid}")
        assert res.status_code == 200
        data = res.json()
        assert data["userId"] == uid
        assert data["travelPreference"] == "safest"
        assert data["womenSafetyMode"] is False
        assert "resolvedWeights" in data
        assert data["resolvedWeights"]["crimeWeight"] >= 1.0

        # 2. Update profile enabling Women Safety Mode & custom preference
        payload = {
            "userId": uid,
            "travelPreference": "safest",
            "nightTravelEnabled": False,
            "womenSafetyMode": True,
            "avoidHighCrimeAreas": True
        }
        put_res = await client.put("/api/profile/safety-settings", json=payload)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["womenSafetyMode"] is True
        assert put_data["nightTravelEnabled"] is False
        assert put_data["resolvedWeights"]["womenSafetyMultiplier"] >= 1.2
        assert put_data["resolvedWeights"]["crimeWeight"] >= 1.5

        # 3. Retrieve updated profile
        get_res = await client.get(f"/api/profile/safety-settings?userId={uid}")
        assert get_res.status_code == 200
        assert get_res.json()["womenSafetyMode"] is True


@pytest.mark.asyncio
async def test_dynamic_weight_resolution_rules():
    # Women safety mode disabled
    w_default = compute_profile_weights(women_safety_mode=False)
    # Women safety mode enabled
    w_women = compute_profile_weights(women_safety_mode=True)
    assert w_women.crimeWeight >= 1.5
    assert w_women.nightRiskWeight >= 1.4
    assert w_women.isolationWeight >= 1.3
    assert w_women.emergencyPOIWeight >= 1.2
    assert w_women.womenSafetyMultiplier == 1.25

    # Night time auto-detection (e.g. 23:30)
    w_night = compute_profile_weights(
        women_safety_mode=False,
        at_time_iso="2026-09-11T23:30:00+05:30"
    )
    assert w_night.nightRiskWeight >= NIGHT_MODE_CONFIG["full_night_weight"]

    # Daytime (e.g. 14:00)
    w_day = compute_profile_weights(
        women_safety_mode=False,
        at_time_iso="2026-09-11T14:00:00+05:30"
    )
    assert w_day.nightRiskWeight == 1.0


@pytest.mark.asyncio
async def test_safety_score_breakdown_and_explainability():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "segments": [
                {"segmentIndex": 0, "riskLevel": "HIGH", "crimeCount": 4},
                {"segmentIndex": 1, "riskLevel": "MEDIUM", "crimeCount": 2},
                {"segmentIndex": 2, "riskLevel": "LOW", "crimeCount": 0}
            ],
            "atTime": "2026-09-11T23:30:00+05:30",
            "weights": {
                "crimeWeight": 1.5,
                "nightRiskWeight": 1.4,
                "womenSafetyMultiplier": 1.25
            }
        }
        res = await client.post("/api/safety-score/calculate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "safetyScore" in data
        assert "breakdown" in data
        assert len(data["breakdown"]) >= 3
        # Verify factor breakdown items contain factor and numeric impact
        for item in data["breakdown"]:
            assert "factor" in item
            assert "impact" in item
            assert isinstance(item["impact"], (int, float))


@pytest.mark.asyncio
async def test_route_compare_with_user_weights():
    from unittest.mock import patch
    from app.routers.route_compare import compare_cache
    await compare_cache.clear()

    mock_alts = [
        {"distance": 18.0, "duration": 35.0, "geometry": [[77.20, 28.61], [77.39, 28.53]]},
        {"distance": 22.0, "duration": 48.0, "geometry": [[77.20, 28.61], [77.30, 28.58], [77.39, 28.53]]}
    ]
    mock_risk = {
        "highRiskSegmentCount": 1,
        "totalSegments": 5,
        "segments": [{"crimeCount": 3, "riskLevel": "HIGH"}]
    }

    async def mock_fetch_alts(client, src, dst):
        return mock_alts

    async def mock_risk_api(client, geom):
        return mock_risk

    with patch("app.routers.route_compare.fetch_route_alternatives", side_effect=mock_fetch_alts):
        with patch("app.routers.route_compare.analyze_route_risk_api", side_effect=mock_risk_api):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                payload = {
                    "source": {"lat": 28.6139, "lng": 77.2090},
                    "destination": {"lat": 28.5355, "lng": 77.3910},
                    "userId": "test_user_compare_1",
                    "atTime": "2026-09-11T20:00:00+05:30"
                }
                res = await client.post("/api/routes/compare", json=payload)
                assert res.status_code == 200
                data = res.json()
                assert "fastest" in data
                assert "safest" in data
                assert "balanced" in data
                assert "breakdown" in data["safest"]
                assert len(data["safest"]["breakdown"]) >= 1


@pytest.mark.asyncio
async def test_analytics_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Crime by Area
        res_area = await client.get("/api/analytics/crime-by-area")
        assert res_area.status_code == 200
        areas = res_area.json()
        assert isinstance(areas, list)
        assert len(areas) > 0
        assert "area" in areas[0]
        assert "crimeCount" in areas[0]

        # 2. Crime by Time
        res_time = await client.get("/api/analytics/crime-by-time")
        assert res_time.status_code == 200
        time_data = res_time.json()
        assert "hourly" in time_data
        assert len(time_data["hourly"]) == 24
        assert "dayOfWeek" in time_data

        # 3. Crime by Type
        res_type = await client.get("/api/analytics/crime-by-type")
        assert res_type.status_code == 200
        type_data = res_type.json()
        assert isinstance(type_data, list)
        assert len(type_data) > 0
        assert "percentage" in type_data[0]

        # 4. Risk Trend
        res_trend = await client.get("/api/analytics/risk-trend?days=7")
        assert res_trend.status_code == 200
        trend_data = res_trend.json()
        assert "trends" in trend_data
        assert len(trend_data["trends"]) == 7
        assert "avgSafetyScore" in trend_data["trends"][0]

        # 5. Recompute cache
        res_recompute = await client.post("/api/analytics/recompute")
        assert res_recompute.status_code == 200
        assert res_recompute.json()["status"] == "success"


@pytest.mark.asyncio
async def test_ai_briefing_with_explainability_breakdown():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "distance": 14.2,
            "duration": 38.0,
            "safetyScore": 58.0,
            "hotspots": 2,
            "highRiskSegments": 1,
            "breakdown": [
                {"factor": "2 theft hotspots", "impact": -10},
                {"factor": "Night travel", "impact": -8},
                {"factor": "Police station nearby", "impact": 8}
            ],
            "alternative": {
                "type": "safest",
                "duration": 44.0,
                "safetyScore": 94.0
            }
        }
        res = await client.post("/api/ai/briefing", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "briefing" in data
        assert "Why this score?" in data["briefing"]
        assert "2 theft hotspots" in data["briefing"]
        assert "Recommendation:" in data["briefing"]
