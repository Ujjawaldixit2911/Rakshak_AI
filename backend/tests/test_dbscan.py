"""
test_dbscan.py
Unit tests for DBSCAN crime hotspot clustering.
"""
import pytest
from app.ml.hotspot_detector import detect_hotspots
from app.database import AsyncSessionLocal

@pytest.mark.asyncio
async def test_dbscan_clustering_delhi():
    async with AsyncSessionLocal() as session:
        hotspots = await detect_hotspots(session, city="Delhi", eps_km=0.5, min_samples=5)
        assert hotspots["type"] == "FeatureCollection"
        assert hotspots["total_incidents"] > 0
        assert hotspots["total_hotspots"] > 0
        assert len(hotspots["features"]) == hotspots["total_hotspots"]

        top_feature = hotspots["features"][0]
        assert "geometry" in top_feature
        assert "properties" in top_feature
        assert "risk_score" in top_feature["properties"]
        assert 0.0 <= top_feature["properties"]["risk_score"] <= 100.0
