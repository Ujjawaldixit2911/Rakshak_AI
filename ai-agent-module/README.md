# AI Agent Module (Rakshak AI)

## Architectural Principle
**Strict Layer Separation**:
`Agent -> Tools -> Backend REST APIs -> Services -> Database`

The AI Agent **NEVER** touches any database table or ORM model directly. Every single action is executed via discrete, pure HTTP client wrappers calling existing module REST APIs.

---

## Registered Tools
1. `get_current_location()` &rarr; Location Module / User GPS Context
2. `search_location(query)` &rarr; Location Module `POST /api/location/geocode`
3. `calculate_route(src, dest)` &rarr; Route Module `POST /api/route/calculate`
4. `get_crime_data(lat, lng, radius)` &rarr; Crime Data Module `GET /api/crimes/nearby`
5. `analyze_route_risk(geometry)` &rarr; Route Risk Module `POST /api/risk/analyze-route`
6. `find_safe_route(src, dest, atTime)` &rarr; Three-Route Engine `POST /api/routes/compare`
7. `get_nearby_emergency_services(lat, lng, type)` &rarr; Emergency POI Module `GET /api/emergency/nearby`

---

## API Specification

### POST `/api/agent/query`

#### Request Body
```json
{
  "message": "Mujhe Ghaziabad se Noida jaana hai safest route se.",
  "userId": "usr_9921",
  "userLocation": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "city": "Delhi"
  }
}
```

#### Response Body
```json
{
  "reply": "Here is your route comparison from Ghaziabad to Noida:\n\nYour journey is 15.2 km and approximately 35 minutes...",
  "toolCallsUsed": [
    "search_location",
    "search_location",
    "find_safe_route"
  ],
  "route": {
    "fastest": { ... },
    "safest": { ... },
    "balanced": { ... }
  },
  "toolLogs": [
    {
      "stepIndex": 1,
      "toolName": "search_location",
      "arguments": { "query": "Ghaziabad" },
      "output": { "status": "SUCCESS", "latitude": 28.6692, "longitude": 77.4538 },
      "latencyMs": 14.5,
      "timestamp": "2026-09-11T01:50:00Z",
      "status": "SUCCESS"
    }
  ],
  "status": "COMPLETED"
}
```

---

## Key Guarantees
- **Zero Hallucination**: AI only explains data returned by deterministic routing & safety analytics engines.
- **Ambiguity Protection**: If a location cannot be resolved or has ambiguous matches, the agent prompts the user with clarifying options instead of guessing.
- **Infinite Loop Cap**: Execution is strictly bounded to a maximum of 6 tool-call iterations per query.
- **Auditable**: Every tool call, latency measurement, and argument is recorded in the execution log.
