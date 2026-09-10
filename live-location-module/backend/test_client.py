"""
test_client.py
Standalone WebSocket test client for Live Location Sharing.
Demonstrates:
1. Connecting to room sos:{sosId}:location
2. Receiving INITIAL_TRAIL_REPLAY
3. Pushing live GPS pings
4. Receiving real-time broadcasted updates
"""
import asyncio
import json
import httpx
import websockets

BACKEND_WS_URL = "ws://127.0.0.1:8000/ws/live-location"
BACKEND_HTTP_URL = "http://127.0.0.1:8000"


async def simulate_live_location_tracking(sos_id: str = "1"):
    print(f"\n🚀 [TestClient] Connecting to Live Location stream for SOS #{sos_id}...")
    uri = f"{BACKEND_WS_URL}/{sos_id}"

    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ [TestClient] Connected to WebSocket channel: sos:{sos_id}:location")

            # 1. Receive initial trail replay
            initial_msg = await websocket.recv()
            data = json.loads(initial_msg)
            print(f"📦 [TestClient] Received initial handshake: {data.get('type')}")
            print(f"   • Replayed Points: {data.get('totalReplayedPoints', 0)}")

            # 2. Simulate streaming 5 GPS pings
            coords = [
                (28.6139, 77.2090, 15.0),
                (28.6145, 77.2098, 16.2),
                (28.6152, 77.2105, 14.8),
                (28.6160, 77.2112, 17.0),
                (28.6170, 77.2120, 15.5),
            ]

            for i, (lat, lng, spd) in enumerate(coords, start=1):
                await asyncio.sleep(1.0)
                ping_payload = {
                    "type": "LOCATION_PING",
                    "latitude": lat,
                    "longitude": lng,
                    "speed": spd,
                    "accuracy": 5.0,
                    "battery": 85 - i,
                }
                print(f"📡 [TestClient] Sending GPS Ping #{i}: ({lat}, {lng}) at {spd} km/h")
                await websocket.send(json.dumps(ping_payload))

                # Receive broadcast echo from room
                broadcast_echo = await websocket.recv()
                echo_data = json.loads(broadcast_echo)
                print(f"🔔 [TestClient] Broadcast received: {echo_data.get('type')} from {echo_data.get('channel')}")

            print("\n🎉 [TestClient] Live streaming simulation complete!")

    except Exception as e:
        print(f"❌ [TestClient] Connection error (ensure backend server is running): {e}")


if __name__ == "__main__":
    asyncio.run(simulate_live_location_tracking())
