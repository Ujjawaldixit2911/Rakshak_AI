"""
event_bus.py
Decoupled Event Publisher / Pub-Sub Engine for Rakshak AI.
Enables SOS Module to publish lifecycle events (SOS_TRIGGERED, SOS_RESOLVED, SOS_CANCELLED)
without directly touching Notification, Live Location, or Trusted Contacts database tables.
"""
import asyncio
import logging
from typing import Dict, Any, List, Callable, Coroutine
from datetime import datetime, timezone

logger = logging.getLogger("RakshakAI.EventBus")


class SOSEventBus:
    """
    Lightweight In-Memory Pub/Sub Event Bus for development/demo.
    For production enterprise deployment, this publisher forwards to Kafka / RabbitMQ / Redis PubSub.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]]] = {
            "SOS_TRIGGERED": [],
            "SOS_RESOLVED": [],
            "SOS_CANCELLED": [],
            "SOS_STATUS_UPDATED": [],
        }
        self.published_history: List[Dict[str, Any]] = []

        # Register default decoupled module subscribers
        self._register_default_subscribers()

    def subscribe(self, event_type: str, handler: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]):
        """Register a subscriber handler for an event topic."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Publishes an event to all registered subscribers asynchronously.
        Does not block on individual subscriber failures.
        """
        event_record = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        self.published_history.append(event_record)
        logger.info("📢 [EventBus] Publishing %s for SOS event %s (User %s)", event_type, payload.get("sosId"), payload.get("userId"))

        handlers = self._subscribers.get(event_type, [])
        results = []
        for handler in handlers:
            try:
                res = await handler(payload)
                results.append({"handler": handler.__name__, "status": "delivered", "result": res})
            except Exception as e:
                logger.error("❌ [EventBus] Handler %s failed on %s: %s", handler.__name__, event_type, e)
                results.append({"handler": handler.__name__, "status": "failed", "error": str(e)})

        return results

    def _register_default_subscribers(self):
        """Wires decoupled default subscribers simulating external module consumers."""

        # 1. Notification Module Subscriber
        async def notification_module_subscriber(payload: Dict[str, Any]):
            sos_id = payload.get("sosId")
            user_id = payload.get("userId")
            lat = payload.get("latitude")
            lng = payload.get("longitude")
            logger.info("🔔 [Notification Module] Received SOS broadcast for User %s at (%s, %s). Triggering SMS & Push Alarms...", user_id, lat, lng)
            return {"service": "notification", "action": "push_alarms_dispatched", "sosId": sos_id}

        # 2. Live Location Module Subscriber
        async def live_location_subscriber(payload: Dict[str, Any]):
            sos_id = payload.get("sosId")
            user_id = payload.get("userId")
            logger.info("📍 [Live Location Module] Starting high-frequency GPS telemetry telemetry session for SOS #%s (User %s)", sos_id, user_id)
            return {"service": "live_location", "action": "telemetry_session_started", "sosId": sos_id}

        # 3. Trusted Contacts Module Subscriber
        async def trusted_contacts_subscriber(payload: Dict[str, Any]):
            sos_id = payload.get("sosId")
            user_id = payload.get("userId")
            logger.info("🛡️ [Trusted Contacts Module] Sending encrypted live tracking link & coordinates to user %s emergency contacts.", user_id)
            return {"service": "trusted_contacts", "action": "sos_sms_broadcast", "sosId": sos_id}

        self.subscribe("SOS_TRIGGERED", notification_module_subscriber)
        self.subscribe("SOS_TRIGGERED", live_location_subscriber)
        self.subscribe("SOS_TRIGGERED", trusted_contacts_subscriber)


# Singleton Event Bus instance
sos_event_bus = SOSEventBus()
