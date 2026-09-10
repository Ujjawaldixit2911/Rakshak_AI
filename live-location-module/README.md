# Live Location Sharing Module — Rakshak AI

The **Live Location Sharing Module** is a high-performance, real-time GPS telemetry streaming service activated during an active emergency SOS event. It broadcasts continuous location updates to trusted contacts and police monitors via WebSockets.

---

## 🏛️ Architecture & Room Scoping

```mermaid
graph TD
    UserApp[User Frontend Device] -->|Every ~5s GPS Ping| Ingest[POST /api/live-location/update OR WebSocket]
    Ingest -->|1. Validate ACTIVE SOS| SOSAPI[SOS Module API]
    Ingest -->|2. Append to Rolling Buffer| RingBuffer[In-Memory Deque - Last 50 Points]
    Ingest -->|3. Broadcast to Room| Room[WebSocket Room: sos:{sosId}:location]

    Room -->|Stream Update| Contact1[Trusted Contact A Browser]
    Room -->|Stream Update| Contact2[Trusted Contact B Mobile]
    Room -->|Stream Update| PoliceDesk[Police Command Dashboard]
```

### Key Architectural Tenets:
1. **Decoupled WebSocket Layer**: Does not own SOS or Trusted Contacts tables. Queries SOS Module's `GET /api/sos/{sosId}` to verify status.
2. **Room Scoping**: Dedicated broadcast room per SOS event: `sos:{sosId}:location`.
3. **Rolling Reconnect Buffer**: Keeps the last 50 GPS points in memory. When a trusted contact joins or reconnects, the server sends an immediate `INITIAL_TRAIL_REPLAY` so the map renders the full recent path instantly.
4. **Auto-Termination**: Subscribes to `SOS_RESOLVED` and `SOS_CANCELLED` events. When the SOS ends, the room broadcasts an `SOS_ENDED` message and closes all WebSocket connections.
5. **No Contact PII**: Knows nothing about user phone numbers or emails — it only broadcasts to whoever is subscribed to the authorized room.

---

## 📡 API & WebSocket Protocols

### 1. Ingest Location Update (REST)
```http
POST /api/live-location/update
Content-Type: application/json

{
  "sosId": "1",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "speed": 15.2,
  "heading": 180.0,
  "accuracy": 8.0,
  "battery": 78
}
```

### 2. Connect to Live Stream (WebSocket)
```
ws://localhost:8000/ws/live-location/{sosId}
```

#### Initial Connection Message:
```json
{
  "type": "INITIAL_TRAIL_REPLAY",
  "channel": "sos:1:location",
  "sosId": "1",
  "totalReplayedPoints": 12,
  "trail": [ ... ],
  "connectedAt": "2026-09-11T02:00:00Z"
}
```

#### Live Broadcast Event:
```json
{
  "type": "LOCATION_UPDATE",
  "channel": "sos:1:location",
  "data": {
    "sosId": "1",
    "latitude": 28.6145,
    "longitude": 77.2098,
    "timestamp": "2026-09-11T02:00:05Z",
    "speed": 16.0,
    "heading": 185.0,
    "accuracy": 6.0,
    "battery": 77
  }
}
```

### 3. Query Rolling Trail History
```http
GET /api/live-location/{sosId}/trail
```

---

## 🧪 Running the Test Client

A standalone test client is included in [live-location-module/backend/test_client.py](file:///c:/Users/ujjaw/OneDrive/Desktop/Rakshak_AI/live-location-module/backend/test_client.py):

```bash
# Ensure backend server is running (port 8000)
python live-location-module/backend/test_client.py
```
