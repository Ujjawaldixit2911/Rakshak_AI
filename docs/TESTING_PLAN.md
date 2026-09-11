# Comprehensive Quality Assurance & Testing Plan
**Crime Alert Map (Rakshak AI)**

---

## 1. Testing Pyramid & Verification Coverage

```
                  ┌──────────────────────┐
                  │   End-to-End Tests   │ (Cypress / Playwright / Flutter Driver)
                  ├──────────────────────┤
                  │  Integration Tests   │ (FastAPI TestClient + PostGIS Live DB)
                  ├──────────────────────┤
                  │ Spatial & Algo Tests │ (DBSCAN Clustering, Dijkstra Routing)
                  ├──────────────────────┤
                  │      Unit Tests      │ (Pytest, Jest, Dart Test)
                  └──────────────────────┘
```

---

## 2. Test Execution Matrix

| Test Category | Framework | Key Scenarios Tested | Success Threshold |
| :--- | :--- | :--- | :--- |
| **Spatial & GIS Unit Tests** | `pytest`, `shapely`, `geopandas` | Great-circle Haversine accuracy, polygon buffering, spatial point-in-polygon containment (`ST_Contains`), line intersection. | 100% Pass, Metric tolerance $< 1\text{m}$. |
| **DBSCAN Clustering Tests** | `pytest`, `scikit-learn` | Cluster generation on synthetic & real coordinates, noise rejection of isolated pins, alpha-hull geometry closure. | Silhouette Score $> 0.45$, zero invalid geometries. |
| **Route Cost Evaluator** | `pytest`, `networkx` | Fastest mode optimizes time, Safest mode strictly minimizes risk exposure, weight parameter sanity ($\alpha+\beta+\gamma=1.0$). | Route safety score strictly higher on Safest vs. Fastest. |
| **API Endpoints & RBAC** | `pytest`, `httpx` (async) | `/api/v1/auth`, `/api/v1/routes/analyze`, `/api/v1/crimes/hotspots`, JWT expiration, rate limit throttling, SQL injection injection defense. | 100% Pass, Response time $< 150\text{ms}$ at p95. |
| **Data Ingestion Tests** | `pytest`, `pydantic` | Missing coordinate rejection, boundary validation (lat $\in [6.5, 37.5]$, lon $\in [68.0, 97.5]$), precision tag preservation. | Zero unvalidated records written to PostGIS. |
| **Web UI & Map Rendering** | `Jest`, `React Testing Library`, `Playwright` | Auth gateway login flow, demo credentials auto-fill, Leaflet/MapLibre map zoom rendering, turn-by-turn route stepper. | Zero runtime console errors, WCAG 2.1 AA accessibility. |
| **Mobile Integration** | `flutter_test`, `integration_test` | Riverpod state transitions, GPS stream handling, offline SQLite fallbacks, SOS 3-second abort timer trigger. | Zero memory leaks, 60fps UI rendering. |
