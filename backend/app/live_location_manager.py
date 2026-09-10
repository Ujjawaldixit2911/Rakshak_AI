"""
live_location_manager.py
Room Manager and Rolling GPS Telemetry Buffer for Rakshak AI Live Location Sharing.
Manages active WebSocket rooms scoped by sosId (sos:{sosId}:location).
Stores an in-memory rolling history of the last N GPS points per SOS event for reconnect resilience.
Decoupled: Does not own SOS or Trusted Contacts tables; queries SOS Module API / events.
"""
import asyncio
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger("RakshakAI.LiveLocationManager")

MAX_ROLLING_TRAIL_POINTS = 50


class LiveLocationRoomManager:
    def __init__(self, max_trail_points: int = MAX_ROLLING_TRAIL_POINTS):
        self.max_trail_points = max_trail_points
        # sos_id -> Set of active WebSocket connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # sos_id -> Deque of last N location points
        self.rolling_trails: Dict[str, deque] = {}
        # sos_id -> last known status
        self.room_status: Dict[str, str] = {}

    def get_room_channel(self, sos_id: str) -> str:
        """Standardized WebSocket channel name."""
        return f"sos:{sos_id}:location"

    def get_subscribers_count(self, sos_id: str) -> int:
        """Returns the number of active live viewers connected to this SOS room."""
        return len(self.rooms.get(str(sos_id), set()))

    async def join_room(self, sos_id: str, websocket: WebSocket) -> List[Dict[str, Any]]:
        """
        Accepts and adds a WebSocket to the SOS room.
        Returns the existing rolling trail replay for immediate render.
        """
        sos_key = str(sos_id)
        if sos_key not in self.rooms:
            self.rooms[sos_key] = set()
        if sos_key not in self.rolling_trails:
            self.rolling_trails[sos_key] = deque(maxlen=self.max_trail_points)

        self.rooms[sos_key].add(websocket)
        logger.info("👥 [LiveLocation] Client joined room %s. Active viewers: %d", sos_key, len(self.rooms[sos_key]))

        # Return copy of existing rolling trail
        return list(self.rolling_trails[sos_key])

    def leave_room(self, sos_id: str, websocket: WebSocket):
        """Removes a WebSocket from the room."""
        sos_key = str(sos_id)
        if sos_key in self.rooms:
            self.rooms[sos_key].discard(websocket)
            if not self.rooms[sos_key]:
                del self.rooms[sos_key]
            logger.info("👋 [LiveLocation] Client left room %s", sos_key)

    async def record_and_broadcast_location(
        self,
        sos_id: str,
        latitude: float,
        longitude: float,
        timestamp: Optional[str] = None,
        speed: Optional[float] = None,
        heading: Optional[float] = None,
        accuracy: Optional[float] = None,
        battery: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Appends point to rolling history and broadcasts update to all room subscribers.
        """
        sos_key = str(sos_id)
        ts = timestamp or datetime.now(timezone.utc).isoformat()

        point_data = {
            "sosId": sos_key,
            "channel": self.get_room_channel(sos_key),
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": ts,
            "speed": speed,
            "heading": heading,
            "accuracy": accuracy,
            "battery": battery,
        }

        # Append to rolling trail
        if sos_key not in self.rolling_trails:
            self.rolling_trails[sos_key] = deque(maxlen=self.max_trail_points)
        self.rolling_trails[sos_key].append(point_data)

        # Broadcast to active WebSockets in room
        subscribers = list(self.rooms.get(sos_key, set()))
        broadcast_msg = {
            "type": "LOCATION_UPDATE",
            "channel": self.get_room_channel(sos_key),
            "data": point_data,
        }

        for ws in subscribers:
            try:
                await ws.send_json(broadcast_msg)
            except Exception as e:
                logger.warning("Failed to send location to socket in room %s: %s", sos_key, e)
                self.leave_room(sos_key, ws)

        return {
            "status": "broadcasted",
            "sosId": sos_key,
            "subscribersCount": len(self.rooms.get(sos_key, set())),
            "totalTrailPoints": len(self.rolling_trails[sos_key]),
            "point": point_data,
        }

    async def close_room_on_sos_ended(self, sos_id: str, final_status: str = "RESOLVED"):
        """
        Notifies all connected clients that the SOS event has ended, then closes the sockets.
        """
        sos_key = str(sos_id)
        self.room_status[sos_key] = final_status

        subscribers = list(self.rooms.get(sos_key, set()))
        close_payload = {
            "type": "SOS_ENDED",
            "channel": self.get_room_channel(sos_key),
            "sosId": sos_key,
            "status": final_status,
            "message": f"🚨 SOS Event #{sos_key} is now {final_status}. Live location stream terminated.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        for ws in subscribers:
            try:
                await ws.send_json(close_payload)
                await ws.close(code=1000, reason=f"SOS {final_status}")
            except Exception as e:
                logger.debug("Socket already closed during room termination: %s", e)

        if sos_key in self.rooms:
            del self.rooms[sos_key]

        logger.info("🔒 [LiveLocation] Room %s closed (Status: %s)", sos_key, final_status)

    def get_trail(self, sos_id: str) -> List[Dict[str, Any]]:
        """Returns the rolling trail history for an SOS event."""
        return list(self.rolling_trails.get(str(sos_id), []))


# Global Live Location Room Manager instance
live_location_manager = LiveLocationRoomManager()
