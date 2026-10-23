# PROJECT STATUS

## Existing
- **Node.js**: v24.16.0, npm v11.13.0
- **Python**: v3.14.0
- **MongoDB**: Active and reachable on `127.0.0.1:27017`
- **Documentation**: Comprehensive architecture notes in `docs/` (`AI_ML_ARCHITECTURE.md`, `DATABASE_ARCHITECTURE.md`, `ROUTING_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, etc.)
- **Datasets**: Historical and synthetic geospatial datasets in `backend/data` and modular directories
- **Frontend**: Next.js / React with Leaflet & UI components in `frontend/`
- **Python ML/Data Scripts**: Prototype scripts in `backend/` and sub-modules

## Missing / Required by Fixed Tech Stack (Section 2 & 5)
- **Primary Backend (Node.js/Express)**: Standardized Express application in `backend/` with Mongoose, JWT auth, Role-based access (USER/ADMIN), Socket.IO real-time server, proxying Nominatim/OSRM with caching and rate limiting, deterministic `riskEngine`, SOS & Live Navigation handlers.
- **Python ML Microservice (FastAPI)**: Dedicated `ml/` service with FastAPI on configurable port (e.g. 8000), DBSCAN clustering, Random Forest risk scoring model, Pydantic validation, graceful degradation fallback for Node.js.
- **Unified Frontend Integration**: Integrated React client communicating with Node backend via REST and Socket.IO, with interactive Leaflet map, multi-route comparison (Fastest, Safe, Balanced), risk breakdown, "Why this route / Why not this route" explainability, crime heatmap & filters, SOS workflow with countdown, live navigation deviation recalculation.
- **Automated Test Suites**: Jest/Vitest unit & integration tests for backend (riskEngine, auth, crime API, geospatial corridors), Pytest for ML service, end-to-end smoke verification script.

## Current Technology
- **Primary Backend**: Node.js + Express + Mongoose + Socket.IO + JWT
- **ML / Analytics Service**: Python FastAPI + Scikit-Learn (Random Forest) + DBSCAN + Pandas + NumPy
- **Frontend**: React + Leaflet + OpenStreetMap + Socket.IO client + CSS
- **Database**: MongoDB (Local `mongodb://127.0.0.1:27017/rakshak_ai`) with 2dsphere indexing

## Recommended Phase
- **Phase 1 — Foundation**: Initialize Node.js backend & Python FastAPI ML service structures, verify MongoDB connectivity, setup environment configuration, and create health endpoints.
