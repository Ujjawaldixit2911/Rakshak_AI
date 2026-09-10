# Rakshak AI - Independent Route Module

A decoupled, stateless microservice for calculating driving routes via OSRM (Open Source Routing Machine), performing unit conversions, and outputting decoded GeoJSON geometry.

## Architecture & Isolation
- **Fully decoupled**: No imports or database dependencies from Location, Safety, Crime, or User modules.
- **Contract-first REST API**: Other modules and the frontend interact exclusively through the HTTP endpoint.
- **Provider-agnostic backend proxy**: Frontends never talk directly to OSRM; switching from public OSRM to self-hosted OSRM or Mapbox/GraphHopper requires zero frontend changes.

---

## API Contract

### POST `/api/route/calculate`

#### Request Body
```json
{
  "source": { "lat": 28.6692, "lng": 77.4538 },
  "destination": { "lat": 28.6139, "lng": 77.2090 }
}
```

#### Response (200 OK)
```json
{
  "distance": 32.45,
  "duration": 78.0,
  "geometry": [
    [77.4538, 28.6692],
    [77.3000, 28.6400],
    [77.2090, 28.6139]
  ],
  "eta": "2026-09-11T02:48:00+00:00",
  "eta_formatted": "08:18 AM"
}
```

#### Error Response (404 Not Found)
When OSRM cannot find a drivable route or upstream request times out:
```json
{
  "error": "route_not_found"
}
```

---

## Environment Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | Upstream OSRM service base URL |
| `CACHE_TTL_SECONDS` | `600` (10 min) | In-memory route cache time-to-live |
| `REQUEST_TIMEOUT_SECONDS` | `8.0` | Timeout threshold before returning error |

### Switching to Self-Hosted OSRM (Production)
In production, running a regional self-hosted OSRM instance via Docker avoids public demo server rate limits:

```bash
# 1. Download OSM extract (e.g. India / Delhi NCR from Geofabrik)
wget http://download.geofabrik.de/asia/india-latest.osm.pbf

# 2. Process with OSRM car profile
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/india-latest.osrm

# 3. Launch OSRM routing daemon on port 5000
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/india-latest.osrm

# 4. Point Rakshak AI backend to your local container
export OSRM_BASE_URL="http://localhost:5000"
```

---

## Running Standalone Tests
```bash
pytest backend/tests/test_route.py
```
