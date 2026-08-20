from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .database import engine, Base, get_db
from .models import CrimeIncident
import logging
import os
from dotenv import load_dotenv
from shapely.geometry import LineString, Point
from groq import Groq

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Rakshak AI", description="Crime-aware safe navigation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq Client setup
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not set. Please add it to your backend/.env file.")
groq_client = Groq(api_key=GROQ_API_KEY)

class RouteRequest(BaseModel):
    coordinates: list[list[float]] # [lat, lng]

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up API...")

@app.post("/api/analyze-route")
async def analyze_route(route: RouteRequest, db: AsyncSession = Depends(get_db)):
    # 1. Convert Route to Shapely LineString (using lng, lat for proper projection roughly)
    line = LineString([(c[1], c[0]) for c in route.coordinates])
    
    # Approx 150m buffer in degrees (very rough estimate for Delhi region ~0.00135 degrees)
    buffer_zone = line.buffer(0.00135) 
    
    # 2. Fetch all crimes (For MVP, we fetch all and filter in python, or could filter by bounding box)
    result = await db.execute(select(CrimeIncident))
    crimes = result.scalars().all()
    
    # 3. Find crimes within the buffer
    crimes_on_route = []
    for crime in crimes:
        pt = Point(crime.lng, crime.lat)
        if buffer_zone.contains(pt):
            crimes_on_route.append(crime)
            
    # 4. Calculate Risk Score
    # Simple formula: 1 point for low severity, 3 for high severity. 
    score = sum((c.severity or 1) for c in crimes_on_route)
    
    if score < 20:
        risk_level = "Safe"
        color = "green"
    elif score < 60:
        risk_level = "Medium"
        color = "yellow"
    else:
        risk_level = "High"
        color = "red"
        
    # 5. Generate AI Briefing with Groq
    prompt = f"Act as Rakshak AI, a safety navigation assistant. The user is traveling a route in Delhi NCR. There are {len(crimes_on_route)} reported crime incidents near this route historically (Score: {score}, Level: {risk_level}). Write a short 3-sentence safety briefing. Do not claim the route is perfectly safe. Be helpful and professional."
    
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=150,
        )
        briefing = completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Groq error: {e}")
        briefing = f"This route has a {risk_level} historical risk profile based on {len(crimes_on_route)} nearby incidents. Please stay alert."
    
    return {
        "risk_level": risk_level,
        "color": color,
        "incident_count": len(crimes_on_route),
        "ai_briefing": briefing
    }

# --- SOS Feature ---
from fastapi import WebSocket, WebSocketDisconnect
from .models import SOSAlert
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/police")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

class SOSRequest(BaseModel):
    lat: float
    lng: float
    user_id: int = 1 # Dummy user ID for MVP

@app.post("/api/sos")
async def trigger_sos(sos: SOSRequest, db: AsyncSession = Depends(get_db)):
    # Create SOS Record
    alert = SOSAlert(user_id=sos.user_id, lat=sos.lat, lng=sos.lng, status="Alert Received")
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    
    # Broadcast to Police Dashboard
    alert_data = {
        "id": alert.id,
        "lat": alert.lat,
        "lng": alert.lng,
        "status": alert.status,
        "created_at": alert.created_at.isoformat()
    }
    await manager.broadcast(alert_data)
    
    return {"message": "SOS Alert Sent", "alert": alert_data}
