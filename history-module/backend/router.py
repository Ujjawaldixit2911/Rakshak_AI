"""
router.py
Journey History Microservice Module Router for Rakshak AI.
Logs completed travel routes and retrieves historical journeys for a user.
"""
from app.routers.history import (
    router,
    get_user_history,
    log_journey_history,
    JourneyHistoryCreate,
    JourneyHistoryItem,
    DEFAULT_DEMO_HISTORY,
)

__all__ = [
    "router",
    "get_user_history",
    "log_journey_history",
    "JourneyHistoryCreate",
    "JourneyHistoryItem",
    "DEFAULT_DEMO_HISTORY",
]
