"""
agent_tools package.
Registry of all Agent tools calling backend REST APIs.
"""
from typing import Dict, Any, Callable, Coroutine

from .get_current_location import get_current_location
from .search_location import search_location
from .calculate_route import calculate_route
from .get_crime_data import get_crime_data
from .analyze_route_risk import analyze_route_risk
from .find_safe_route import find_safe_route
from .get_nearby_emergency_services import get_nearby_emergency_services

TOOL_REGISTRY: Dict[str, Callable[..., Coroutine[Any, Any, Dict[str, Any]]]] = {
    "get_current_location": get_current_location,
    "search_location": search_location,
    "calculate_route": calculate_route,
    "get_crime_data": get_crime_data,
    "analyze_route_risk": analyze_route_risk,
    "find_safe_route": find_safe_route,
    "get_nearby_emergency_services": get_nearby_emergency_services,
}

__all__ = [
    "TOOL_REGISTRY",
    "get_current_location",
    "search_location",
    "calculate_route",
    "get_crime_data",
    "analyze_route_risk",
    "find_safe_route",
    "get_nearby_emergency_services",
]
