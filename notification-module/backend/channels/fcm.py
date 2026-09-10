"""
fcm.py
Firebase Cloud Messaging (FCM) Push Notification Channel.
"""
import logging
from typing import Dict, Any
from .base import BaseNotificationChannel

logger = logging.getLogger("RakshakAI.Channel.FCM")


class FCMChannel(BaseNotificationChannel):
    @property
    def name(self) -> str:
        return "PUSH"

    async def deliver(self, user_id: str, formatted_message: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("📲 [FCM Push Gateway] Delivering push notification to user '%s': %s", user_id, formatted_message[:80])
        return {
            "channel": self.name,
            "status": "SENT",
            "provider": "FCM",
            "userId": user_id
        }
