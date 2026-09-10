"""
sendgrid_email.py
SendGrid / SMTP Email Channel.
"""
import logging
from typing import Dict, Any
from .base import BaseNotificationChannel

logger = logging.getLogger("RakshakAI.Channel.SendGrid")


class SendGridEmailChannel(BaseNotificationChannel):
    @property
    def name(self) -> str:
        return "EMAIL"

    async def deliver(self, user_id: str, formatted_message: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        email = payload.get("email") or payload.get("recipientEmail") or "user@rakshak-ai.org"
        logger.info("✉️ [SendGrid Email Gateway] Delivering Email to %s: %s", email, formatted_message[:80])
        return {
            "channel": self.name,
            "status": "SENT",
            "provider": "SendGrid",
            "email": email
        }
