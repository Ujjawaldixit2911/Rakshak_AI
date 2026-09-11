# REST API Specification (OpenAPI 3.1 v1)
**Crime Alert Map (Rakshak AI)**
*Base URL: `/api/v1` | Protocol: HTTPS / WSS | Format: JSON*

---

## 1. Authentication & Identity Endpoints

### 1.1 `POST /api/v1/auth/login`
- **Description**: Authenticate user via email/password or Google OAuth token and return JWT Bearer token.
- **Request Body**:
  ```json
  {
    "email": "citizen@rakshak.ai",
    "password": "SecurePassword123",
    "field_of_use": "Citizen"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "expires_in_seconds": 86400,
    "user": {
      "id": 104,
      "email": "citizen@rakshak.ai",
      "full_name": "Aditi Sharma",
      "role": "CITIZEN",
      "field_of_use": "Citizen"
    }
  }
  ```

---

## 2. Geospatial & Crime Intelligence Endpoints

### 2.1 `GET /api/v1/crimes/hotspots`
- **Description**: Retrieve active DBSCAN-computed crime hotspot polygons within a specified bounding box or city district.
- **Query Parameters**:
  - `city` *(string, required)*: e.g., `"Delhi"`, `"Mumbai"`, `"Bengaluru"`.
  - `min_risk` *(string, optional)*: Filter by `CRITICAL_DANGER`, `HIGH`, `MODERATE`.
- **Response `200 OK`**:
  ```json
  {
    "city": "Delhi",
    "total_hotspots": 18,
    "algorithm": "DBSCAN",
    "model_version": "v2.4-spatial",
    "hotspots": [
      {
        "id": 12,
        "district": "Central Delhi",
        "spot_name": "Paharganj / New Delhi Station Dark Alleyways",
        "risk_tag": "CRITICAL_DANGER",
        "incident_count": 14,
        "dominant_crime": "Mobile Snatching & Cash Robbery",
        "lighting_score": 28,
        "polygon_coordinates": [
          [28.6433, 77.2144], [28.6450, 77.2180], [28.6410, 77.2190], [28.6433, 77.2144]
        ],
        "why_avoided": "Main Janpath / Connaught Place corridor avoids these unlit market alleys completely."
      }
    ]
  }
  ```

---

## 3. Safety-Aware Route Optimization Endpoint

### 3.1 `POST /api/v1/routes/analyze`
- **Description**: Evaluates and computes parallel route options (Fastest vs. Safest vs. Balanced) with complete segment-by-segment risk breakdown, lighting metrics, and avoided crime hotspots.
- **Request Body**:
  ```json
  {
    "origin": [28.6315, 77.2167],
    "destination": [28.5245, 77.2066],
    "origin_name": "Connaught Place",
    "dest_name": "Saket",
    "city": "Delhi",
    "safety_mode": "safest",
    "departure_time": "2026-09-11T22:00:00Z"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "route_plan_id": "rt_8492049",
    "city": "Delhi",
    "safest_route": {
      "distance_km": 14.2,
      "estimated_time_minutes": 28,
      "average_safety_score": 88,
      "risk_badge": "AI Safe Corridor (95% Lit)",
      "waypoints": ["Connaught Place", "Janpath Corridor", "India Gate Outer Ring", "AIIMS Avenues", "Saket"],
      "coordinates": [[28.6315, 77.2167], [28.6200, 77.2180], [28.6129, 77.2295], [28.5672, 77.2100], [28.5245, 77.2066]],
      "avoided_hotspots_count": 3,
      "why_selected": "Routes via illuminated arterial avenues with continuous CCTV and PCR presence, bypassing Paharganj alleys and Minto Underpass."
    },
    "fastest_route": {
      "distance_km": 12.8,
      "estimated_time_minutes": 24,
      "average_safety_score": 54,
      "risk_badge": "Elevated Risk",
      "why_avoided": "Traverses 2 unlit narrow bypasses with high historical snatching reports after 9:30 PM."
    },
    "balanced_route": {
      "distance_km": 13.5,
      "estimated_time_minutes": 26,
      "average_safety_score": 76,
      "risk_badge": "Moderate Safety"
    }
  }
  ```

---

## 4. Emergency POI & Crowdsourced Reporting Endpoints

### 4.1 `GET /api/v1/emergency-services/nearby`
- **Query Parameters**: `lat` *(float)*, `lon` *(float)*, `radius_km` *(float, default 5.0)*
- **Response `200 OK`**:
  ```json
  {
    "search_center": [28.6315, 77.2167],
    "police_stations": [
      {
        "name": "Connaught Place Police Station",
        "distance_meters": 350,
        "phone": "011-23363363",
        "emergency_no": "112",
        "is_women_helpdesk": true
      }
    ],
    "hospitals": [
      {
        "name": "RML Hospital Emergency & Trauma Care",
        "distance_meters": 1200,
        "has_24x7_ambulance": true,
        "phone": "011-23365525"
      }
    ]
  }
  ```

### 4.2 `POST /api/v1/reports`
- **Description**: Submit a crowdsourced citizen incident or hazard report.
- **Request Body**:
  ```json
  {
    "category": "DARK_UNLIT_ROAD",
    "description": "Street lights broken along service road for past 2 weeks.",
    "latitude": 28.6433,
    "longitude": 77.2144,
    "media_url": null
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "report_id": 9012,
    "status": "UNVERIFIED",
    "message": "Report logged and queued for multi-user community corroboration and police moderation."
  }
  ```

---

## 5. Data Governance & Coverage Endpoints

### 5.1 `GET /api/v1/data-sources`
- **Description**: Transparent catalog of all official datasets ingested, licensing, update frequencies, and last retrieval timestamps.
- **Response `200 OK`**:
  ```json
  {
    "total_sources": 8,
    "sources": [
      {
        "source_name": "NCRB Crime in India",
        "organization": "Ministry of Home Affairs, Govt. of India",
        "tier": "TIER_A_OFFICIAL",
        "spatial_resolution": "DISTRICT",
        "license": "GODL-India",
        "last_retrieved": "2026-09-01T00:00:00Z"
      }
    ]
  }
  ```
