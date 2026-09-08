# 🛡️ Crime Alert Map (Rakshak AI)
### AI-Powered Crime Hotspot Detection & Safe Navigation Web Platform

> **Final-Year B.Tech Computer Science Project**  
> *IMS Engineering College, Ghaziabad (AKTU)*

---

## 📌 Project Overview
**Crime Alert Map (Rakshak AI)** is an AI-driven GIS platform that models spatial crime density, evaluates a dynamic **Area Safety Score (0–100)**, recommends the **Safest Travel Route** (via modified Dijkstra), and provides emergency response tools (Women Safety Mode, Live SOS WebSockets, and Police Command Analytics).

The platform is seeded with a 5,000-row, 38-column verified dataset (`ride_safety_dataset.csv`) across **Delhi** and **Mumbai**.

---

## 🚀 Tech Stack
- **Backend**: Python 3.11+, FastAPI (Async REST + WebSockets + Auto-docs at `/docs`)
- **Database**: PostgreSQL with PostGIS extension (with local SQLite fallback for dev)
- **ML / Graph Algorithms**:
  - **DBSCAN (Haversine metric)** for spatial crime hotspot clustering
  - **Multi-Factor Kernel Decay** for Area Safety Scoring (0–100)
  - **NetworkX / Modified Dijkstra** for risk-penalized safe route recommendation
- **Frontend**: Next.js 16 (App Router), React 19, Leaflet.js, Recharts, TailwindCSS
- **Deployment**: Docker & Docker Compose (`docker-compose up --build`)

---

## ⚡ Quick Start & Execution

### Option A: Run with Docker Compose (Recommended)
```bash
docker-compose up --build
```
- **Citizen Portal**: `http://localhost:3000`
- **Police Dashboard**: `http://localhost:3000/police/dashboard`
- **FastAPI Docs**: `http://localhost:8000/docs`

---

### Option B: Run Locally

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Run Data Preprocessing & Seed Ingestion (5,000 records)
python -m app.load_seed_data

# Start FastAPI Server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔬 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cities` | Returns supported cities and geographic bounding boxes |
| `GET` | `/api/hotspots?city=Delhi` | Returns GeoJSON FeatureCollection of DBSCAN hotspot polygons |
| `GET` | `/api/safety-score?lat=...&lon=...` | Computes dynamic Area Safety Score (0–100) with factor breakdown |
| `GET` | `/api/safety-heatmap?city=Delhi` | Returns spatial grid for Leaflet Heatmap rendering |
| `POST` | `/api/route/safe` | Modified Dijkstra safe routing (Safest vs Fastest Route + AI trade-off) |
| `POST` | `/api/sos` | Emergency SOS trigger (broadcasts live coordinates over WebSocket) |
| `POST` | `/api/incidents/report` | Citizen incident report submission (enters moderation queue) |
| `GET` | `/api/police/dashboard?city=Delhi` | Real crime aggregations, KPIs, and charts for police dashboard |
| `WS` | `/ws/police` | Real-time WebSocket connection for live emergency dispatches |

---

## 📖 Algorithm Defense & Viva Notes
For detailed mathematical formulations, Haversine equations, and Dijkstra cost functions, refer to [`ALGORITHMS.md`](./ALGORITHMS.md).
