"""
dispatcher.py
Async In-Process Notification Dispatcher and Queue Worker.
Delivers immediately across registered channels asynchronously.
"""
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from .template_registry import render_template
from .channels import CHANNEL_ADAPTERS

logger = logging.getLogger("RakshakAI.Notification.Dispatcher")


class NotificationDispatcher:
    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._history: List[Dict[str, Any]] = []

    async def enqueue_notification(
        self,
        event: str,
        user_id: str,
        payload: Dict[str, Any],
        channels: List[str] = None
    ) -> Dict[str, Any]:
        """
        Enqueues a notification event and returns immediately (non-blocking).
        """
        notification_id = f"notif_{uuid.uuid4().hex[:10]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        rendered_text = render_template(event, payload)

        selected_channels = channels or ["PUSH", "IN_APP"]
        if "phone" in payload or "recipients" in payload:
            selected_channels.append("SMS")
        if "email" in payload or "recipients" in payload:
            selected_channels.append("EMAIL")

        selected_channels = list(dict.fromkeys(selected_channels))

        record = {
            "notificationId": notification_id,
            "event": event,
            "userId": user_id,
            "message": rendered_text,
            "channels": selected_channels,
            "payload": payload,
            "status": "QUEUED",
            "enqueuedAt": timestamp
        }

        self._history.append(record)
        # Background delivery task
        asyncio.create_task(self._deliver_async(record))

        return {
            "status": "queued",
            "notificationId": notification_id,
            "event": event,
            "userId": user_id,
            "channels": selected_channels,
            "preview": rendered_text,
            "timestamp": timestamp
        }

    async def _deliver_async(self, record: Dict[str, Any]) -> None:
        try:
            for ch_name in record["channels"]:
                adapter = CHANNEL_ADAPTERS.get(ch_name)
                if adapter:
                    await adapter.deliver(record["userId"], record["message"], record["payload"])
            record["status"] = "DELIVERED"
            record["deliveredAt"] = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            logger.error("Async delivery failed for notification #%s: %s", record["notificationId"], e)
            record["status"] = "FAILED"
            record["error"] = str(e)


# Singleton dispatcher
dispatcher = NotificationDispatcher()
