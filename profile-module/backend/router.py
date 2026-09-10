"""
profile-module/backend/router.py
Standalone Profile Module for Rakshak AI Personalization Layer.
"""
from fastapi import APIRouter
from app.routers.profile import (
    router as profile_api_router,
    compute_profile_weights,
    SafetySettingsPayload,
    SafetySettingsResponse,
    NIGHT_MODE_CONFIG
)

__all__ = [
    "profile_api_router",
    "compute_profile_weights",
    "SafetySettingsPayload",
    "SafetySettingsResponse",
    "NIGHT_MODE_CONFIG"
]
