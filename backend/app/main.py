"""
main.py
FastAPI application for Crime Alert Map (Rakshak AI).
Serves DBSCAN hotspots, dynamic Area Safety Score, Safe Routing engine, Live SOS WebSockets,
and Police Analytics Dashboard.
"""
import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from .database import engine, Base, get_db
from .models import CrimeRecord, SOSAlert, User
from .routers.public import router as public_router
from .routers.police import router as police_router
from .routers.assistant import router as assistant_router
from .routers.agent import router as agent_router
from .routers.modules_router import router as modules_router
from .routers.platform_router import router as platform_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RakshakAI")

app = FastAPI(
    title="Crime Alert Map (Rakshak AI) API",
    description="AI-powered Crime Hotspot Detection (DBSCAN), Multi-factor Area Safety Scoring (0-100), Safe Routing Platform, and Layer 7 Enterprise Architecture.",
    version="2.0.0"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(public_router)
app.include_router(police_router)
app.include_router(assistant_router)
app.include_router(agent_router)
app.include_router(modules_router)
app.include_router(platform_router)


# ─── Startup Event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Check if dataset is already seeded
    try:
        from .load_seed_data import load_seed_data
        async with engine.connect() as conn:
            pass
        from .database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            q = await session.execute(select(func.count()).select_from(CrimeRecord))
            count = q.scalar() or 0
            if count < 5000:
                logger.info(f"Database contains {count} records. Launching automatic seed ingestion...")
                await load_seed_data()
            else:
                logger.info(f"Database is already seeded with {count} records.")
    except Exception as e:
        logger.error(f"Auto-seeding check failed: {e}")


# ─── WebSocket Connection Hub for Police Monitoring ───────────────────────────
class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to socket: {e}")
                self.disconnect(connection)


ws_manager = WebSocketManager()


@app.websocket("/ws/police")
async def police_websocket_endpoint(websocket: WebSocket):
    """Real-time police monitor socket for instant SOS dispatch alerts."""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat
            await websocket.send_json({"type": "heartbeat_ack", "received": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ─── Emergency SOS Trigger ────────────────────────────────────────────────────
class SOSRequest(BaseModel):
    lat: float
    lon: float
    city: Optional[str] = "Delhi"
    user_id: Optional[int] = 3
    emergency_type: Optional[str] = "Immediate Threat / Harassment"


@app.post("/api/sos")
async def trigger_emergency_sos(sos: SOSRequest, db: AsyncSession = Depends(get_db)):
    """
    Triggers instant Emergency SOS:
    1. Persists incident in sos_alerts.
    2. Broadcasts live GPS coordinates via WebSocket to Police Dashboard.
    3. Simulates emergency dispatch notification.
    """
    alert = SOSAlert(
        user_id=sos.user_id,
        lat=sos.lat,
        lon=sos.lon,
        city=sos.city,
        status="Active Dispatch Alert",
        contacts_notified=["+91-9811000000", "Police Control (112)", "Women Helpline (1091)"]
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    alert_payload = {
        "event": "EMERGENCY_SOS_TRIGGERED",
        "alert_id": alert.id,
        "lat": alert.lat,
        "lon": alert.lon,
        "city": alert.city,
        "emergency_type": sos.emergency_type,
        "status": alert.status,
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        "contacts_notified": alert.contacts_notified,
    }

    await ws_manager.broadcast(alert_payload)
    return {
        "status": "success",
        "message": "🚨 SOS Alert broadcasted to Police Command Center & Emergency Contacts.",
        "alert": alert_payload
    }
