# Police & Admin Operations Dashboard (Rakshak AI)

## Features
- **Real-Time Aggregated Overview**: Total user reports, active SOS alerts, crime hotspots, and active police response units.
- **Role-Gated Security**: Strict header & token validation (`X-Admin-Role: admin` / `police`).
- **Interactive Operations Map**: Live layer visualization integrating the Map Intelligence layer (Crime Hotspots, Active SOS beacons, Incident markers, Emergency POIs).
- **Incident Verification & Promotion**: One-click status verification that promotes verified community reports into authoritative crime datasets via `POST /api/crimes`.
- **SOS Emergency Response Assignment**: Real-time PCR van and response team dispatch with automated emergency notifications.
