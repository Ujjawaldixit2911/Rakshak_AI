"""
in_app.py
In-App Notification & Realtime Audit Channel.
"""
import logging
from typing import Dict, Any
from .base import BaseNotificationChannel

logger = logging.getLogger("RakshakAI.Channel.InApp")


class InAppChannel(BaseNotificationChannel):
    @property
    def name(self) -> str:
        return "IN_APP"

    async def deliver(self, user_id: str, formatted_message: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("🔔 [In-App Notification] Queued in-app banner for user '%s'", user_id)
        return {
            "channel": self.name,
            "status": "STORED",
            "userId": user_id
        }
