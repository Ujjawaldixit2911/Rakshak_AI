"""
event_bus.py
Decoupled Pub/Sub event bus for the SOS Module.
Publishes lifecycle events to external subscribers (Notification, Live Location, Trusted Contacts)
without sharing database tables.
"""
import logging
from typing import Dict, Any, List, Callable, Coroutine
from datetime import datetime, timezone

logger = logging.getLogger("RakshakAI.SOSModule.EventBus")

class SOSEventBus:
    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]]] = {
            "SOS_TRIGGERED": [],
            "SOS_RESOLVED": [],
            "SOS_CANCELLED": [],
            "SOS_STATUS_UPDATED": [],
        }
        self.published_history: List[Dict[str, Any]] = []
        self._register_default_subscribers()

    def subscribe(self, event_type: str, handler: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        event_record = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        self.published_history.append(event_record)
        logger.info("📢 [EventBus] Published %s event: %s", event_type, payload.get("sosId"))

        handlers = self._subscribers.get(event_type, [])
        results = []
        for handler in handlers:
            try:
                res = await handler(payload)
                results.append({"handler": handler.__name__, "status": "delivered", "result": res})
            except Exception as e:
                logger.error("❌ [EventBus] Handler %s failed: %s", handler.__name__, e)
                results.append({"handler": handler.__name__, "status": "failed", "error": str(e)})

        return results

    def _register_default_subscribers(self):
        async def notification_sub(payload: Dict[str, Any]):
            logger.info("🔔 [Notification Module] Received SOS broadcast for User %s", payload.get("userId"))
            return {"service": "notification", "status": "dispatched"}

        async def live_location_sub(payload: Dict[str, Any]):
            logger.info("📍 [Live Location Module] Starting tracking session for SOS #%s", payload.get("sosId"))
            return {"service": "live_location", "status": "session_active"}

        async def trusted_contacts_sub(payload: Dict[str, Any]):
            logger.info("🛡️ [Trusted Contacts Module] Alerting emergency contacts for User %s", payload.get("userId"))
            return {"service": "trusted_contacts", "status": "sms_queued"}

        self.subscribe("SOS_TRIGGERED", notification_sub)
        self.subscribe("SOS_TRIGGERED", live_location_sub)
        self.subscribe("SOS_TRIGGERED", trusted_contacts_sub)

sos_event_bus = SOSEventBus()
