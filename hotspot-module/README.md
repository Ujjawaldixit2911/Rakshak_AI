# Rakshak AI - Independent Crime Hotspot Module

A decoupled analytical service layered strictly on top of the Crime Data Module's REST API (`GET /api/crimes/nearby`). It does **NOT** access the crime database directly.

---

## 1. Architectural Rules & Decoupling
- **API Consumer Only**: Queries crime frequencies exclusively through `GET /api/crimes/nearby`.
- **Stateless & Cached**: Caches precomputed grid calculations with a 6-hour TTL (`HOTSPOT_CACHE_TTL_SECONDS`).
- **Configurable Risk Thresholds**: Thresholds are loaded dynamically from environment variables or configuration files, allowing seamless threshold tuning per dataset/region without code changes.

---

## 2. Configurable Threshold Boundaries

| Crime Count in Zone | Default Risk Level | Env Variable Override |
| :--- | :--- | :--- |
| `0` to `5` | **LOW** | `HOTSPOT_THRESHOLD_LOW_MAX` (default: 5) |
| `6` to `15` | **MEDIUM** | `HOTSPOT_THRESHOLD_MEDIUM_MAX` (default: 15) |
| `16` to `30` | **HIGH** | `HOTSPOT_THRESHOLD_HIGH_MAX` (default: 30) |
| `30+` (31+) | **CRITICAL** | Any count greater than `HOTSPOT_THRESHOLD_HIGH_MAX` |

### Threshold Tuning Example (.env)
```env
# Stricter thresholds for high-density metropolitan zones
HOTSPOT_THRESHOLD_LOW_MAX=3
HOTSPOT_THRESHOLD_MEDIUM_MAX=10
HOTSPOT_THRESHOLD_HIGH_MAX=20

# Crime API endpoint to query
CRIME_API_BASE=http://127.0.0.1:8000

# Cache TTL (6 hours in seconds)
HOTSPOT_CACHE_TTL_SECONDS=21600
```

---

## 3. API Contract

### 1. Zone Hotspot Analysis: `POST /api/hotspots/analyze`
Fetches crime count in real-time from Crime Data Module and evaluates zone risk.

#### Request Body
```json
{
  "latitude": 28.62,
  "longitude": 77.21,
  "radiusKm": 1.0
}
```

#### Response (200 OK)
```json
{
  "riskLevel": "HIGH",
  "crimeCount": 27,
  "latitude": 28.62,
  "longitude": 77.21
}
```

---

### 2. Precomputed City Hotspots: `GET /api/hotspots`
Returns precomputed grid hotspots for map visualization with 6-hour caching.

#### Response (200 OK)
```json
[
  {
    "latitude": 28.6304,
    "longitude": 77.2177,
    "riskLevel": "CRITICAL",
    "crimeCount": 42
  },
  {
    "latitude": 28.6506,
    "longitude": 77.2303,
    "riskLevel": "HIGH",
    "crimeCount": 22
  }
]
```

---

## 4. Running Tests
```bash
pytest backend/tests/test_hotspots.py
```
