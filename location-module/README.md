# Rakshak AI - Independent Location Module

A decoupled proxy microservice for forward geocoding (search) and reverse geocoding via OpenStreetMap's Nominatim service, featuring upstream rate-limiting (max 1 req/sec) and in-memory TTL caching (24 hours).

## Architecture & Policy Compliance
- **Decoupled**: Zero imports from Route, Safety, Crime, or User modules.
- **Nominatim Usage Policy Compliant**: Enforces >= 1.05s between upstream calls and supplies a custom User-Agent and Referer header.
- **Caching Layer**: 24-hour in-memory TTL cache to minimize upstream requests for repeated addresses or coordinates.

---

## API Contract

### 1. Forward Geocoding: `POST /api/location/geocode`
Converts place name/address string into latitude and longitude coordinates.

#### Request Body
```json
{
  "query": "Ghaziabad"
}
```

#### Response (200 OK)
```json
{
  "address": "Ghaziabad, Uttar Pradesh, India",
  "latitude": 28.6692,
  "longitude": 77.4538
}
```

---

### 2. Reverse Geocoding: `POST /api/location/reverse-geocode`
Converts GPS coordinates into a human-readable address.

#### Request Body
```json
{
  "latitude": 28.6692,
  "longitude": 77.4538
}
```

#### Response (200 OK)
```json
{
  "address": "Ghaziabad, Uttar Pradesh, India"
}
```

---

## Running Standalone Tests
```bash
pytest backend/tests/test_location.py
```
