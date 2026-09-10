# Rakshak AI - Independent ETA Module

A decoupled, lightweight microservice for travel time arithmetic and timezone-aware Estimated Time of Arrival (ETA) calculation.

## Architectural Purpose
- **Separation of Concerns**: Route calculation determines distance and raw duration. The ETA Module is dedicated solely to reference time arithmetic, timezone offsets, countdown generation, and 12h/24h string formatting.
- **Universal Reusability**: Usable by Route, Emergency Dispatch, Patrol Dispatch, or any future journey module without duplicating time-math.
- **Zero Routing Knowledge**: Does not import or know about OSRM, GPS coordinates, maps, or database tables.

---

## API Contract

### POST `/api/eta/calculate`

#### Request Body
```json
{
  "duration": 78.0,
  "departure_time": "2026-09-11T01:30:00Z",
  "timezone_offset_minutes": 330,
  "format_24h": false
}
```

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `duration` | float | Yes | - | Duration in minutes |
| `departure_time` | string (ISO-8601) | No | Current UTC | Reference departure timestamp |
| `timezone_offset_minutes`| int | No | 330 (IST) | Client timezone offset in minutes |
| `format_24h` | boolean | No | `false` | 12h AM/PM vs 24h clock format |

#### Response (200 OK)
```json
{
  "duration_minutes": 78.0,
  "formatted_duration": "1 hr 18 min",
  "departure_time": "2026-09-11T01:30:00+00:00",
  "eta_iso": "2026-09-11T02:48:00+00:00",
  "eta_formatted": "08:18 AM",
  "relative_eta": "in 1 hr 18 min"
}
```
