# Crime Alert Map (Rakshak AI) — Project Master Plan
**AI-Powered India-Wide Crime & Road Safety Intelligence Platform**  
*Tagline: "Navigate Smart. Stay Safe."*

---

## 1. Executive Summary & Problem Statement

India possesses one of the world's most extensive road networks (>6.3 million km) and a population exceeding 1.4 billion. Millions of citizens, commuters, solo travelers, shift workers, and delivery personnel traverse urban and rural corridors daily under varying safety conditions. 

### The Core Challenges:
1. **Siloed & Aggregated Safety Data**: Official public safety statistics (e.g., NCRB annual reports, MoRTH accident reports) exist in static PDF/tabular formats aggregated at state or district levels, disconnected from real-time navigation platforms.
2. **Shortest vs. Safest Routing Dilemma**: Conventional commercial navigation engines (Google Maps, Apple Maps) optimize exclusively for distance and traffic latency ($f(\text{time}, \text{distance})$), routinely routing pedestrians and drivers through isolated, poorly lit, or historically crime-dense bypasses.
3. **Data Integrity & False Precision Epidemic**: Unscientific safety apps frequently fabricate coordinates for district-level crimes, synthesize unverified rumors, or make discriminatory claims regarding neighborhoods without statistical rigor or location precision tracking.

### The Solution:
**Crime Alert Map (Rakshak AI)** is an extensible, open-architecture, production-grade geospatial safety intelligence platform designed specifically for India. It combines:
- Authoritative multi-tier data ingestion (NCRB, OGD, MoRTH, OpenStreetMap, verified municipal feeds).
- Strict multi-resolution location precision management (`EXACT`, `ROAD_SEGMENT`, `POLICE_STATION`, `VILLAGE`, `DISTRICT`, `STATE`).
- PostGIS-powered spatial intelligence and DBSCAN cluster analysis.
- Multi-objective safe route optimization with configurable Safety Modes (Standard, Night Mode, Women Safety Priority).
- Zero-hallucination grounded AI Copilot with RAG capabilities.
- Cross-platform Web (Next.js 16/React) and Mobile (Flutter iOS & Android) interfaces.

---

## 2. Core Principles & Non-Negotiable Tenets

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE ARCHITECTURAL PILLARS                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. ABSOLUTE DATA HONESTY     │ Never fabricate incidents or statistics │
│ 2. LOCATION PRECISION ETHICS │ District stats are NEVER turned to pins │
│ 3. RESPONSIBLE & FAIR AI     │ No demographic/caste/religion bias      │
│ 4. MULTI-TIER DATA PROVENANCE│ Every visual point has verifiable source│
│ 5. NO FALSE CERTAINTY        │ Probabilistic & historical risk wording │
│ 6. TRANSPARENT COVERAGE      │ Clearly mark limited or missing coverage│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. High-Level System Landscape

```mermaid
flowchart TB
    subgraph DataIngestion ["Data Ingestion & Normalization Engine"]
        A1[Tier A: NCRB / OGD / MoRTH] --> INGEST[Ingestion Controller]
        A2[Tier B: OpenStreetMap / GIS] --> INGEST
        A3[Tier C: Academic / Research] --> INGEST
        A4[Tier E: User Reports (Unverified)] --> INGEST
        INGEST --> VALIDATE[Data Validation & Precision Tagging]
        VALIDATE --> DEDUP[Deduplication & Canonical Linking]
    end

    subgraph Storage ["Geospatial Database Layer"]
        DEDUP --> POSTGIS[(PostgreSQL 16 + PostGIS 3.4)]
        POSTGIS --> TAB1[crime_incidents]
        POSTGIS --> TAB2[crime_statistics (Aggregated)]
        POSTGIS --> TAB3[accidents]
        POSTGIS --> TAB4[road_network & segments]
        POSTGIS --> TAB5[emergency_services]
    end

    subgraph Analytics ["AI / ML & Spatial Analytics Engine"]
        POSTGIS --> ML1[DBSCAN Hotspot Detection]
        POSTGIS --> ML2[Multi-Factor Risk Scoring Engine]
        POSTGIS --> ML3[Segment-Level Predictive Model]
        POSTGIS --> ROUTE_ENG[Safety-Aware Multi-Factor Route Optimizer]
    end

    subgraph BackendAPI ["FastAPI REST & WebSocket Gateway"]
        ML1 & ML2 & ML3 & ROUTE_ENG --> API[FastAPI Core Service]
        API --> RAG[Grounded AI Copilot & RAG Assistant]
        API --> AUTH[JWT Auth & RBAC]
        API --> CACHE[(Redis Caching Layer)]
    end

    subgraph ClientApplications ["Client Applications"]
        API --> WEB[Responsive Web Dashboard (Next.js / TypeScript)]
        API --> ANDROID[Android Application (Flutter)]
        API --> IOS[iOS Application (Flutter)]
        API --> ADMIN[Admin & Data Governance Portal]
    end
```

---

## 4. Master Development Roadmap (Phases 1 - 8)

| Phase | Milestone Name | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Architecture, Data Models & Foundation** | Documentation suite, PostgreSQL + PostGIS schemas, boundary imports (Survey of India / OSM), Ingestion pipelines. |
| **Phase 2** | **Multi-Tier Ingestion & Core Crime GIS** | Ingestion of NCRB district stats, MoRTH road accident data, OSM highway network, precision tagging engine, GIS web map viewer. |
| **Phase 3** | **Spatial Analytics & Hotspot Detection** | DBSCAN spatial clustering, Kernel Density Estimation (KDE), 0-100 Crime Alert Risk Score formula, dynamic heatmap rendering. |
| **Phase 4** | **Safety-Aware Route Recommendation** | Segment-level graph analysis, weighted Dijkstra/A* safety algorithm, Fastest vs. Safest vs. Balanced comparisons, Night Safety & Women Safety modes. |
| **Phase 5** | **Cross-Platform Mobile Application** | Flutter iOS/Android app, live GPS tracking, route navigation, nearby emergency services POI lookup, SOS safety trigger. |
| **Phase 6** | **Crowdsourced Reporting & Verification** | User incident reporting with spam/duplicate detection, 2-stage police/moderator workflow, geofenced alerts, notifications. |
| **Phase 7** | **Predictive Intelligence & RAG AI Copilot** | Gradient Boosted / Random Forest risk forecasting, Grounded Supervisor RAG assistant citing official data sources. |
| **Phase 8** | **Hardening, Compliance, Testing & Deployment** | End-to-end testing (unit, GIS, integration), Dockerization, CI/CD pipeline, DPDP Act 2023 compliance audit, production deployment. |

---

## 5. Technology Stack Matrix

| Component | Selected Technology | Technical Justification |
| :--- | :--- | :--- |
| **Primary Database** | PostgreSQL 16 + PostGIS 3.4 | Industry gold-standard for geospatial indexing (R-Tree / GiST), spatial joins (`ST_DWithin`, `ST_Intersects`), and geometry computations. |
| **Backend Framework** | Python 3.11 + FastAPI + AsyncPG | High-performance asynchronous REST API, automatic OpenAPI/Swagger generation, native ML library interoperability. |
| **AI / ML & Analytics** | Scikit-Learn, GeoPandas, Shapely, NetworkX, Libpysal | Efficient spatial clustering (DBSCAN, HDBSCAN), spatial weights, graph routing, and risk regression. |
| **Web Application** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Leaflet / MapLibre GL | Server-side rendering, type safety, hardware-accelerated vector map rendering, high accessibility compliance. |
| **Mobile Application** | Flutter 3.x (Dart) for Android & iOS | Single unified codebase, native 60fps UI performance, background geofencing and offline SQLite caching. |
| **Cache & Task Queue** | Redis 7 + Celery / ARQ | Caching repeated spatial queries, bounding-box tile responses, and asynchronous ingestion pipelines. |
| **Container & CI/CD** | Docker, Docker Compose, GitHub Actions | Reproducible multi-service deployment, automated testing and linting across environments. |
