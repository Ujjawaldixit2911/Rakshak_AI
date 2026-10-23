# RAKSHAK AI — SYSTEM ARCHITECTURE

## Overview
Rakshak AI is an explainable AI-powered safety navigation platform that evaluates multiple route alternatives using historical crime data, geospatial analysis, and machine-learning risk estimation.

```text
┌─────────────────────────────────────────────────────────────┐
│                   Next.js / React Frontend                  │
│       Leaflet Maps · Live Navigation · SOS Trigger          │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST + Socket.IO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│  - JWT & RBAC Auth (USER / ADMIN)                           │
│  - Deterministic Risk Engine & Explainability Generator     │
│  - Spatial Corridor Analytics (Haversine & Segmentation)    │
│  - Nominatim Geocoding Proxy (Throttled & Cached)           │
│  - OSRM Route Optimizer Proxy                               │
│  - Real-Time Socket.IO Server (Rooms & Emergency Dispatch)  │
└──────────────┬───────────────────────────────┬──────────────┘
               │ Mongoose                      │ HTTP (Circuit Breaker)
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│       MongoDB Database       │ │   Python FastAPI ML Service │
│  - 2dsphere GeoJSON Indexes  │ │  - Random Forest Regressor  │
│  - Spatial Polygon Queries   │ │  - Haversine DBSCAN Clusters│
│  - Time-Decayed Collections  │ │  - Time-Series Evaluation   │
└──────────────────────────────┘ └─────────────────────────────┘
```

## Core Subsystems

### 1. Deterministic Risk Engine (`backend/src/services/riskEngine.js`)
- Pure mathematical functions without DB I/O.
- Sub-components: Crime Frequency, Severity Weighting, Density (per km), Hotspot Intersections, Recency (90-day half-life exponential decay), and ML Risk score.
- Dynamic normalization and automatic weight renormalization if the ML service is offline.
- Confidence scoring and transparent data quality notes.

### 2. Geospatial Analysis & Spatial Queries (`backend/src/services/geospatialService.js`)
- Route segmentation into 200m blocks.
- Bounding-box and 2dsphere polygon queries (`$geoWithin` / `$nearSphere`) to eliminate full-collection scans.
- Precise perpendicular distance-to-polyline calculation.

### 3. Explainability Engine (`backend/src/services/explanationService.js`)
- Generates "Why this route?" and "Why not this route?" from actual calculated deltas (risk points, incident counts, severe crime counts, duration tradeoff).
- Structured JSON output with strict verification.

### 4. Real-Time & Live Navigation (`backend/src/sockets/index.js` & `tripController.js`)
- Socket.IO gateway with JWT room authorization (`user:<id>` and `admin:channel`).
- Live GPS position monitoring with 75m deviation threshold triggering auto-recalculation.

### 5. Python ML Microservice (`ml/main.py`)
- Random Forest model trained on chronological splits without temporal leakage.
- DBSCAN clustering using Haversine metric in radians.
- Fast, non-blocking HTTP API with circuit-breaker protection in Node.js.
