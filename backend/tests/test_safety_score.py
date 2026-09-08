"""
test_safety_score.py
Unit tests for the Area Safety Score calculation engine.
"""
import pytest
import math
from app.ml.safety_score_engine import haversine_distance, calculate_safety_score
from app.database import AsyncSessionLocal

def test_haversine_distance():
    # Distance between Connaught Place (28.6315, 77.2167) and India Gate (28.6129, 77.2295) approx 2.4 km
    d = haversine_distance(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2.0 <= d <= 2.8, f"Expected distance ~2.4km, got {d}"

    # Distance to same point must be 0
    assert haversine_distance(28.6315, 77.2167, 28.6315, 77.2167) == 0.0

@pytest.mark.asyncio
async def test_safety_score_range_and_factors():
    async with AsyncSessionLocal() as session:
        score_data = await calculate_safety_score(
            session=session,
            lat=28.6315,
            lon=77.2167,
            city="Delhi",
            time_of_day="Night",
            mode="women_safety"
        )
        assert "safety_score" in score_data
        assert 0.0 <= score_data["safety_score"] <= 100.0
        assert score_data["risk_level"] in ["Safe Area", "Moderate Caution", "High Risk Area"]
        assert "factors" in score_data
        assert score_data["factors"]["avg_cctv_cameras"] >= 0
