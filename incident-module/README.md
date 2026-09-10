# Incident Reporting Module (Rakshak AI)

## Architectural Role
The **Incident Reporting Module** captures and tracks crowd-sourced safety and crime reports from citizens. 

### Separation of Concerns
- **Unverified vs. Authoritative Isolation**: User reports remain isolated inside the `incidents` table until reviewed by authorized personnel.
- **REST Promotion**: When an incident status transitions to `"Verified"`, the Incident Module calls the Crime Data Module's REST API (`POST /api/crimes`) with `source="user_report_verified"`. It **never** writes directly into the `crime_records` table.
- **Spam Guard**: Sliding-window rate limiting per `userId` (max 5 reports/minute).
- **Object Storage**: Photos are stored in object storage / disk; only URLs are persisted in the database.

---

## API Specification

### POST `/api/incidents`
```json
{
  "userId": "usr_9912",
  "crimeType": "Harassment",
  "latitude": 28.6250,
  "longitude": 77.2180,
  "description": "Broken streetlights near metro exit, suspicious activity observed.",
  "photoUrl": "https://storage.rakshak-ai.org/reports/img_9912.jpg"
}
```

### GET `/api/incidents?status=Reported`
```json
{
  "total": 1,
  "page": 1,
  "limit": 50,
  "incidents": [
    {
      "id": 1,
      "userId": "usr_9912",
      "crimeType": "Harassment",
      "latitude": 28.625,
      "longitude": 77.218,
      "description": "Broken streetlights near metro exit, suspicious activity observed.",
      "photoUrl": "https://storage.rakshak-ai.org/reports/img_9912.jpg",
      "status": "Reported",
      "createdAt": "2026-09-11T02:00:00Z"
    }
  ]
}
```

### PATCH `/api/incidents/:id/status` (Admin / Police Only)
Header: `X-Admin-Role: admin`
```json
{
  "status": "Verified",
  "adminNotes": "Verified via PCR 14 patrol unit on site."
}
```
*(Promotes incident into authoritative dataset via Crime Data Module `POST /api/crimes`)*
