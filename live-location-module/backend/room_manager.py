"""
room_manager.py
Room Manager and Rolling GPS Trail Buffer for Live Location Sharing.
"""
from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Set
from fastapi import WebSocket

MAX_ROLLING_TRAIL_POINTS = 50

class LiveLocationRoomManager:
    def __init__(self, max_trail_points: int = MAX_ROLLING_TRAIL_POINTS):
        self.max_trail_points = max_trail_points
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.rolling_trails: Dict[str, deque] = {}

    def get_room_channel(self, sos_id: str) -> str:
        return f"sos:{sos_id}:location"

    async def join_room(self, sos_id: str, websocket: WebSocket) -> List[Dict[str, Any]]:
        sos_key = str(sos_id)
        if sos_key not in self.rooms:
            self.rooms[sos_key] = set()
        if sos_key not in self.rolling_trails:
            self.rolling_trails[sos_key] = deque(maxlen=self.max_trail_points)

        self.rooms[sos_key].add(websocket)
        return list(self.rolling_trails[sos_key])

    def leave_room(self, sos_id: str, websocket: WebSocket):
        sos_key = str(sos_id)
        if sos_key in self.rooms:
            self.rooms[sos_key].discard(websocket)
            if not self.rooms[sos_key]:
                del self.rooms[sos_key]

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

        if sos_key not in self.rolling_trails:
            self.rolling_trails[sos_key] = deque(maxlen=self.max_trail_points)
        self.rolling_trails[sos_key].append(point_data)

        broadcast_msg = {
            "type": "LOCATION_UPDATE",
            "channel": self.get_room_channel(sos_key),
            "data": point_data,
        }

        for ws in list(self.rooms.get(sos_key, set())):
            try:
                await ws.send_json(broadcast_msg)
            except Exception:
                self.leave_room(sos_key, ws)

        return {
            "status": "broadcasted",
            "sosId": sos_key,
            "subscribersCount": len(self.rooms.get(sos_key, set())),
            "totalTrailPoints": len(self.rolling_trails[sos_key]),
            "point": point_data,
        }

    async def close_room_on_sos_ended(self, sos_id: str, final_status: str = "RESOLVED"):
        sos_key = str(sos_id)
        close_msg = {
            "type": "SOS_ENDED",
            "channel": self.get_room_channel(sos_key),
            "sosId": sos_key,
            "status": final_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        for ws in list(self.rooms.get(sos_key, set())):
            try:
                await ws.send_json(close_msg)
                await ws.close(code=1000, reason=f"SOS {final_status}")
            except Exception:
                pass

        if sos_key in self.rooms:
            del self.rooms[sos_key]

    def get_trail(self, sos_id: str) -> List[Dict[str, Any]]:
        return list(self.rolling_trails.get(str(sos_id), []))

live_location_manager = LiveLocationRoomManager()
