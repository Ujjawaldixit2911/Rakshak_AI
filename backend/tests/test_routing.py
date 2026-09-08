"""
test_routing.py
Unit tests for Safe Route Recommendation and graph algorithms.
"""
import pytest
from app.ml.routing_engine import build_road_graph, find_nearest_node, compute_safe_and_fast_routes
from app.database import AsyncSessionLocal

def test_road_graph_construction():
    delhi_g = build_road_graph("Delhi")
    assert delhi_g.number_of_nodes() >= 15
    assert delhi_g.number_of_edges() >= 18

    mumbai_g = build_road_graph("Mumbai")
    assert mumbai_g.number_of_nodes() >= 15
    assert mumbai_g.number_of_edges() >= 18

def test_nearest_node_mapping():
    g = build_road_graph("Delhi")
    nearest = find_nearest_node(g, 28.6315, 77.2167)
    assert nearest == "connaught_place"

@pytest.mark.asyncio
async def test_safe_and_fast_routes_computation():
    async with AsyncSessionLocal() as session:
        route_data = await compute_safe_and_fast_routes(
            session=session,
            origin_lat=28.6315,
            origin_lon=77.2167,
            dest_lat=28.5245,
            dest_lon=77.2066,
            city="Delhi",
            time_of_day="Night",
            mode="women_safety"
        )
        assert "safest_route" in route_data
        assert "fastest_route" in route_data
        assert "trade_off" in route_data
        assert len(route_data["safest_route"]["coordinates"]) >= 2
        assert route_data["safest_route"]["distance_km"] > 0
        assert route_data["safest_route"]["average_safety_score"] >= 0
