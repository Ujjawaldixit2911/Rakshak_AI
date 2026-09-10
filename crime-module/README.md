# Rakshak AI - Independent Crime Data Module

The core intelligence layer owning crime records and exposing them strictly via REST API. No other module (Route, ETA, Location) reads its database directly; everything goes through these endpoints. This module has zero knowledge of routing, geocoding, or ETA logic.

---

## API Contract

### 1. Paginated Filter Search: `GET /api/crimes`
Query crime records with filtering and pagination.

#### Query Parameters
- `crimeType`: e.g. `Theft`, `Harassment`, `Assault`
- `severity`: `low` | `medium` | `high`
- `from`: `YYYY-MM-DD`
- `to`: `YYYY-MM-DD`
- `page`: default `1`
- `limit`: default `50`

#### Response (200 OK)
```json
{
  "total": 420,
  "page": 1,
  "results": [
    {
      "id": 101,
      "crimeType": "Theft",
      "latitude": 28.62,
      "longitude": 77.21,
      "date": "2026-09-11",
      "time": "14:30:00",
      "severity": "high",
      "location": "Sector 18, Noida",
      "source": "Delhi Police Open Data"
    }
  ]
}
```

---

### 2. Geospatial Radius Search: `GET /api/crimes/nearby`
Finds crime incidents within a radius in kilometers, sorted by distance ascending.

#### Query Parameters
- `lat`: float (required)
- `lng`: float (required)
- `radiusKm`: float (default `5.0`)
- `severity`: optional (`low` | `medium` | `high`)
- `limit`: default `100`

#### Response (200 OK)
```json
[
  {
    "id": 101,
    "crimeType": "Theft",
    "latitude": 28.62,
    "longitude": 77.21,
    "date": "2026-09-11",
    "time": "14:30:00",
    "severity": "medium",
    "location": "Sector 18, Noida",
    "source": "Delhi Police Open Data",
    "distanceKm": 0.82
  }
]
```

---

### 3. Record Incident: `POST /api/crimes`
Persists a new crime incident record.

#### Request Body
```json
{
  "crimeType": "Theft",
  "latitude": 28.62,
  "longitude": 77.21,
  "date": "2026-09-11",
  "time": "14:30",
  "severity": "medium",
  "location": "Sector 18, Noida",
  "source": "user_report"
}
```

#### Response (201 Created)
```json
{
  "id": 102,
  "crimeType": "Theft",
  "latitude": 28.62,
  "longitude": 77.21,
  "date": "2026-09-11",
  "time": "14:30:00",
  "severity": "medium",
  "location": "Sector 18, Noida",
  "source": "user_report"
}
```

---

## Running Tests
```bash
pytest backend/tests/test_crimes.py
```
