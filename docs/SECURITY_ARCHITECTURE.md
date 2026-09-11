# Security Architecture & Privacy Policy (DPDP Act 2023)
**Crime Alert Map (Rakshak AI)**

---

## 1. Compliance with Digital Personal Data Protection Act (DPDP Act 2023, India)

As a safety intelligence platform processing user telemetry and geolocation, **Crime Alert Map** implements strict data fiduciary responsibilities:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PRIVACY & DATA PROTECTION FRAMEWORK                     │
├────────────────────────────────────────────────────────────────────────────┤
│ 1. PURPOSE LIMITATION        │ Location is used ONLY for route computation │
│ 2. ZERO USER TRACKING PERSIST│ Real-time GPS trails are NEVER stored       │
│ 3. RIGHT TO FORGET / ERASURE │ One-click complete account & data deletion  │
│ 4. ANONYMIZED REPORTING      │ Crowdsourced reports stripped of identity   │
│ 5. NO DISCRIMINATORY BIAS    │ Zero demographic/religious/caste variables  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Security Safeguards

### 2.1 Geospatial Privacy & Ephemeral Telemetry
- **No Continuous Coordinate Logging**: GPS pings sent during live navigation are processed in-memory for off-route detection and discarded immediately.
- **Geographic K-Anonymity on Reports**: Public incident flags round user coordinates to a $100\text{m}$ grid centroid to prevent pinpointing individual households.
- **Explicit Location Consent**: Mobile and Web applications mandate explicit runtime permission requests with clear explanatory dialogs.

### 2.2 Application & Network Security Matrix
- **Authentication**: Stateless JSON Web Tokens (JWT) signed using HMAC-SHA256 with 24-hour expiration. Passwords hashed using `bcrypt` (work factor 12).
- **Injection Prevention**: 100% of database queries use parameterized SQL via SQLAlchemy / AsyncPG ORM with strict PostGIS geometry type validation.
- **Rate Limiting**: Redis-backed Token Bucket algorithm limiting unauthenticated endpoints to $60\text{ req/min}$ and authenticated endpoints to $300\text{ req/min}$.
- **CORS & Headers**: Strict CORS origin whitelisting, Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- **Secret Management**: Environment variables managed via `.env` files isolated from Git via `.gitignore`. Production secrets loaded via cloud secret managers (AWS Secrets Manager / GCP Secret Manager).

---

## 3. Responsible AI & Anti-Discrimination Ethics

1. **Spatial vs. Demographic Independence**: The AI models predict risk strictly based on physical and environmental attributes (historical crime frequencies, accident counts, road infrastructure, streetlight illumination, emergency POI distance).
2. **Strict Prohibition of Protected Attributes**: Variables concerning religion, caste, ethnicity, gender ratios, or socioeconomic demographics are **strictly excluded** from feature engineering and training datasets.
3. **Transparency in Risk Communication**: The UI communicates risk as probabilistic and historical (*"Historically higher crime reports in this commercial sector"*), never labeling communities or neighborhoods as inherently criminal.
