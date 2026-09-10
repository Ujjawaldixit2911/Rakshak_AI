"""
analytics-module/backend/router.py
Standalone Analytics Module for Rakshak AI.
"""
from app.routers.analytics import (
    router as analytics_api_router,
    analytics_cache,
    AreaCrimeSummary,
    TimeCrimeResponse,
    CrimeTypeSummary,
    RiskTrendResponse
)

__all__ = [
    "analytics_api_router",
    "analytics_cache",
    "AreaCrimeSummary",
    "TimeCrimeResponse",
    "CrimeTypeSummary",
    "RiskTrendResponse"
]
