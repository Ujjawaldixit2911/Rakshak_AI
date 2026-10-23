# 🛡️ Rakshak AI — Explainable Safety Navigation Platform

> **Rakshak AI** is an explainable AI-powered safety navigation system that compares multiple route alternatives using historical and recent crime data, geospatial corridor analysis, and machine-learning risk estimation, recommending lower-risk routes while transparently explaining *why* a route was selected and *why* faster alternatives were rejected.

---

## 🚀 Key Features & Differentiators

- **Deterministic Multi-Factor Risk Engine**: Computes pure, verifiable risk scores across 6 distinct dimensions: crime frequency, weighted severity, corridor density, hotspot exposure, recency decay (90-day half-life), and ML prediction.
- **Explainable Navigation ("Why this route?")**: Every recommendation is backed by factual deltas (e.g., *Reduces estimated safety risk by 14 points*, *Bypasses all identified crime clusters*, *Zero high-severity assault incidents*).
- **Interactive Safety Mode Slider**: Seamlessly transitions between `FAST ─── BALANCED ─── SAFEST` modes with immediate client-side and backend reweighting.
- **DBSCAN Spatial Hotspot Clustering**: Machine-learning clustering via Haversine metric in radians detecting geographic danger zones and cluster radii.
- **Random Forest Risk Predictor**: Python FastAPI microservice with strict chronological time-based training (no temporal leakage, MAE: 3.05, R²: 0.976).
- **Live Monitored Trips & Deviation Tracking**: Dynamic route deviation detection (>75m threshold) triggering auto-rerouting and safety advisories.
- **One-Tap SOS Emergency Gateway**: Real-time broadcast to trusted contacts and administrator channels via Socket.IO, with persistent 112 emergency fallback instructions.
- **Community Crime Verification Queue**: Community incident reporting starts in a `PENDING` state and undergoes administrative review before entering official routing datasets.
- **Safe Places Directory**: Nearby police stations, hospitals, and emergency posts mapped via OpenStreetMap Overpass with fallback directories.

---

## 🏗️ Architecture

```text
React / Next.js Frontend ───REST + Socket.IO───► Node.js / Express Backend ───► MongoDB (2dsphere)
                                                          │
                                                          └───HTTP (Circuit Breaker)───► Python FastAPI ML Microservice
```

- **Frontend**: Next.js, React, Leaflet, OpenStreetMap, Recharts, Lucide Icons, Socket.IO Client.
- **Primary Backend**: Node.js, Express, Mongoose, Socket.IO, JWT, bcryptjs, Helmet, Rate Limiter.
- **ML / Analytics**: Python 3.11+, FastAPI, Scikit-Learn (Random Forest), DBSCAN, Pandas, NumPy, Joblib.
- **Database**: MongoDB 7.0 with 2dsphere spatial indexing for sub-second corridor queries.

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install ML dependencies
cd ../ml
pip install -r requirements.txt
```

### 2. Seed Demo Database
```bash
node scripts/seed.js
```
*Seeds default Admin (`admin@rakshakai.org` / `AdminPassword123!`), User (`user@rakshakai.org` / `UserPassword123!`), active alerts, and 120 verified DEMO DATA incidents.*

### 3. Start Services
```bash
# Terminal 1: ML Microservice
cd ml
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2: Backend API Server
cd backend
npm start

# Terminal 3: Frontend Client
cd frontend
npm run dev
```

### 4. Run Automated Test Suites
```bash
# Backend unit & integration tests (24 tests)
cd backend && npm test

# ML microservice tests (4 tests)
pytest ml/tests/test_ml_service.py

# End-to-End System Integration Smoke Test (16/16 steps)
node scripts/e2e-smoke.js
```

---

## 📦 Docker Deployment

To launch the complete multi-service stack via Docker Compose:
```bash
docker-compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Health Status: `http://localhost:5000/api/health`
- ML Microservice: `http://localhost:8000/docs`
- MongoDB: `localhost:27017`

---

## ⚖️ Safety & Data Disclaimer

*Estimates are calculated based on available historical and reported data, which may be incomplete, delayed, or underreported. A low estimated risk score is never a guarantee of safety. In immediate life-threatening danger, users should always call national emergency services (**112**) directly.*
