# Rakshak AI - Independent Route Risk Analysis Module

An orchestration microservice combining route geometry from the **Route Module** and analytical risk queries from the **Hotspot Module** without owning any database tables.

---

## 1. Architectural Role & Decoupling
- **Orchestration Layer**: Does NOT own or connect to database tables.
- **Consumer of Microservices**: Queries `POST /api/hotspots/analyze` for each segment's midpoint.
- **Parallel Execution**: Uses `asyncio.gather` (or `Promise.all`) to execute segment risk lookups concurrently.
- **Per-Geometry Caching**: Caches evaluated routes in memory keyed by polyline MD5 hash (10-minute TTL).

```mermaid
graph TD
    Client[Frontend / Navigator] -->|POST /api/risk/analyze-route\nwith geometry [[lng,lat],...]| RiskMod[Route Risk Module\nPolyline Segmenter]
    RiskMod -->|Concurrent asyncio.gather| HotspotMod[Hotspot Module API\nPOST /api/hotspots/analyze]
    HotspotMod -->|Risk Level per Midpoint| RiskMod
    RiskMod -->|Combined Segments + High-Risk Count| Client
```

---

## 2. API Contract

### `POST /api/risk/analyze-route`

#### Request Body
```json
{
  "geometry": [
    [77.4538, 28.6692],
    [77.3000, 28.6400],
    [77.2090, 28.6139]
  ],
  "segmentLengthKm": 0.8
}
```

#### Response (200 OK)
```json
{
  "segments": [
    {
      "segmentIndex": 0,
      "riskLevel": "LOW",
      "crimeCount": 2,
      "startPoint": [77.4538, 28.6692],
      "endPoint": [77.3000, 28.6400],
      "midPoint": [77.3769, 28.6546]
    },
    {
      "segmentIndex": 1,
      "riskLevel": "HIGH",
      "crimeCount": 24,
      "startPoint": [77.3000, 28.6400],
      "endPoint": [77.2090, 28.6139],
      "midPoint": [77.2545, 28.6270]
    }
  ],
  "highRiskSegmentCount": 1,
  "totalSegments": 2,
  "overallRisk": "HIGH"
}
```

---

## 3. Running Tests
```bash
pytest backend/tests/test_route_risk.py
```
