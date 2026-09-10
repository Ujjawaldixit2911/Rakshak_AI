"""
twilio_sms.py
Twilio SMS Notification Channel.
"""
import logging
from typing import Dict, Any
from .base import BaseNotificationChannel

logger = logging.getLogger("RakshakAI.Channel.Twilio")


class TwilioSMSChannel(BaseNotificationChannel):
    @property
    def name(self) -> str:
        return "SMS"

    async def deliver(self, user_id: str, formatted_message: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        phone = payload.get("phone") or payload.get("recipientPhone") or "DefaultPhone"
        logger.info("📱 [Twilio SMS Gateway] Delivering SMS to %s: %s", phone, formatted_message[:80])
        return {
            "channel": self.name,
            "status": "SENT",
            "provider": "Twilio",
            "phone": phone
        }
