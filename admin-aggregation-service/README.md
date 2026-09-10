# Admin Aggregation Service Module (Rakshak AI)

## Architectural Principle
The **Admin Aggregation Service** is a role-gated aggregation layer. It owns **zero core database tables** and communicates with other microservices (Incidents, SOS, Hotspots, Crime Data, Emergency POIs) strictly via internal REST APIs to aggregate high-level metrics and execute write-through commands.

---

## Endpoints

### 1. GET `/api/admin/summary`
Header: `X-Admin-Role: admin`
Returns aggregated dashboard metrics, total counts, pending incident reviews, active SOS emergency events, and subsystem health.

### 2. POST `/api/admin/sos/:id/assign-response-team`
Header: `X-Admin-Role: police`
Assigns a police response unit (e.g. PCR Van 14) and dispatches automated notifications.
