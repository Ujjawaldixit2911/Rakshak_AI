# RAKSHAK AI — REST & REAL-TIME API SPECIFICATION

## Base URL
`http://localhost:5000/api`

## Authentication Endpoints (`/api/auth`)
- `POST /api/auth/register` — Register new user account (`name`, `email`, `password`, `phone`, optional `role`).
- `POST /api/auth/login` — Login and receive JWT access token.
- `GET /api/auth/me` — Get authenticated user profile (`Bearer <token>`).
- `POST /api/auth/logout` — Invalidate user session.

## Route Planning & Comparison (`/api/routes`)
- `POST /api/routes/plan` — Plan and compare multi-route safety alternatives.
  - Body: `{ origin: { lat, lng, name }, destination: { lat, lng, name }, safetyMode: 'FAST'|'BALANCED'|'SAFE', safetySlider?: number, includeDemo?: boolean }`
  - Returns: Array of routes with duration, distance, riskLevel, overallRisk, safetyScore, confidence, reasons, rejectionReasons.
- `POST /api/routes/save` — Save a route to user profile (Protected).
- `GET /api/routes/saved` — Retrieve saved routes (Protected).
- `DELETE /api/routes/saved/:id` — Delete a saved route (Protected).

## Crime System (`/api/crimes`)
- `GET /api/crimes` — Query crimes with filters (`bbox`, `lat`, `lng`, `radiusMeters`, `category`, `severity`, `verificationStatus`, `includeDemo`).
- `GET /api/crimes/:id` — Get single crime details.
- `POST /api/crimes/report` — Submit a community crime report (Starts as PENDING).
- `POST /api/crimes` — Admin create official crime with spatial deduplication (Admin only).
- `PUT /api/crimes/:id` — Admin update crime (Admin only).
- `DELETE /api/crimes/:id` — Admin delete crime (Admin only).

## Geocoding (`/api/geocoding`)
- `GET /api/geocoding/search?q=<query>&countrycodes=in` — Search location autocomplete (Throttled & Cached).
- `GET /api/geocoding/reverse?lat=<lat>&lng=<lng>` — Reverse geocode coordinates to place details.

## SOS Emergency (`/api/sos`)
- `POST /api/sos/trigger` — Trigger emergency event, broadcast to contacts and admin, return fallback dialer instructions (112).
- `POST /api/sos/cancel/:id` — Cancel triggered emergency within grace period.
- `GET /api/sos/my` — Get user SOS incident history.

## Trusted Contacts (`/api/contacts`)
- `GET /api/contacts` — List user emergency contacts.
- `POST /api/contacts` — Add a new trusted contact (`name`, `phone`, `relationship`, `notifyOnSos`).
- `PUT /api/contacts/:id` — Update contact.
- `DELETE /api/contacts/:id` — Remove contact.

## Live Navigation & Trips (`/api/trips`)
- `POST /api/trips/start` — Start a live monitored trip.
- `POST /api/trips/:id/location` — Telemetry ping; evaluates route deviation (>75m threshold).
- `POST /api/trips/:id/complete` — Complete trip safely.
- `GET /api/trips` — Get user trip history.

## Safe Places & Alerts (`/api/safe-places`, `/api/alerts`)
- `GET /api/safe-places?lat=<lat>&lng=<lng>&radiusMeters=5000` — Find nearby police stations and hospitals.
- `GET /api/alerts` — Get active spatial safety notices and spikes.

## Admin Management (`/api/admin`)
- `GET /api/admin/stats` — System overview metrics (crime counts, verified ratio, active SOS, ML health).
- `GET /api/admin/verification-queue` — Pending community crime report queue.
- `POST /api/admin/verify-report/:id` — Approve and promote report to official Crime collection.
- `POST /api/admin/reject-report/:id` — Reject report with reason.
- `GET /api/admin/hotspots` — Calculate spatial DBSCAN crime hotspots.
- `GET /api/admin/model-metadata` — ML model versions and evaluation metrics.

## Real-Time Events (Socket.IO)
- `user:<userId>` — User-specific room for deviation alerts, SOS confirmations, route updates.
- `admin:channel` — Emergency broadcast room for active SOS triggers and new verification items.
- Event names: `route:deviation`, `crime:new`, `alert:new`, `sos:created`, `sos:cancelled`, `location:update`.
