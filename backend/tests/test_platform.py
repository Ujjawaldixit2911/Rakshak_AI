"""
test_platform.py
Unit tests for Layer 7 Platform & Dynamic Journey State Machine in Rakshak AI.
"""
import pytest
from app.platform_layer import (
    SimpleTTLCache,
    enforce_tool_permission,
    check_role_permission,
    PermissionTier,
    UserRole,
)
from app.journey_manager import haversine_km, min_distance_to_route


def test_permission_tier_enforcement():
    # Tier 1 read tool: should be allowed automatically
    read_res = enforce_tool_permission("get_crime_data", confirmed_by_user=False)
    assert read_res["allowed"] is True
    assert read_res["tier"] == PermissionTier.TIER_1_READ

    # Tier 3 sensitive tool without explicit confirmation: should be blocked
    sos_blocked = enforce_tool_permission("trigger_sos", confirmed_by_user=False)
    assert sos_blocked["allowed"] is False
    assert sos_blocked["requires_confirmation"] is True
    assert sos_blocked["tier"] == PermissionTier.TIER_3_SENSITIVE

    # Tier 3 sensitive tool with user confirmation: should pass
    sos_allowed = enforce_tool_permission("trigger_sos", confirmed_by_user=True)
    assert sos_allowed["allowed"] is True


def test_rbac_hierarchy():
    assert check_role_permission(UserRole.ADMIN, UserRole.POLICE_OFFICER) is True
    assert check_role_permission(UserRole.POLICE_OFFICER, UserRole.PUBLIC_USER) is True
    assert check_role_permission(UserRole.PUBLIC_USER, UserRole.ADMIN) is False


def test_ttl_cache():
    cache = SimpleTTLCache(default_ttl_sec=5)
    cache.set("hotspots_delhi", {"total": 12})
    assert cache.get("hotspots_delhi") == {"total": 12}
    assert cache.get("non_existent_key") is None


def test_haversine_and_deviation_math():
    # CP to India Gate approx 2.4 - 3.8 km
    dist = haversine_km(28.6304, 77.2177, 28.6129, 77.2295)
    assert 2.0 < dist < 4.0

    route_waypoints = [[28.6304, 77.2177], [28.6129, 77.2295]]
    # Close to CP
    min_d = min_distance_to_route(28.6305, 77.2178, route_waypoints)
    assert min_d < 0.1  # Less than 100 meters
