# Notification Engine Module (Rakshak AI)

## Architectural Principle
**Single Unified Event Ingestion Service**:
Other modules (SOS, Risk, Trusted Contacts, Incidents, Route Navigation) **PUBLISH** events to `POST /api/notify`. The Notification Engine alone decides **HOW** to deliver via channel adapters (FCM Push, Twilio SMS, SendGrid Email, In-App). No delivery logic exists anywhere else in the platform.

---

## Supported Events & Dynamic Templates
1. `HIGH_RISK_ROUTE` &rarr; `"⚠ High Risk Area Ahead: A historically high-risk crime segment is approximately {distance}m ahead."`
2. `SOS_TRIGGERED` &rarr; `"🚨 EMERGENCY SOS ALERT: User {userId} triggered an emergency SOS alert at ({latitude}, {longitude}). Live tracking: {liveTrackUrl}"`
3. `CRIME_NEARBY` &rarr; `"⚠ Crime Alert: A {crimeType} was recently reported within {distanceKm}km of your location."`
4. `ROUTE_CHANGED` &rarr; `"🔄 Route Updated: Navigation automatically re-routed to avoid an elevated risk zone. New safety score: {safetyScore}/100."`
5. `EMERGENCY_NEARBY` &rarr; `"🚨 Emergency Support Available: {facilityName} ({facilityType}) is located {distanceKm}km away."`

---

## API Specification

### POST `/api/notify`

#### Request Body
```json
{
  "event": "HIGH_RISK_ROUTE",
  "userId": "usr_9921",
  "payload": {
    "distance": "350",
    "riskLevel": "HIGH",
    "latitude": 28.625,
    "longitude": 77.218
  }
}
```

#### Response Body
```json
{
  "status": "queued",
  "notificationId": "notif_e7b2190fa1",
  "event": "HIGH_RISK_ROUTE",
  "userId": "usr_9921",
  "channels": ["PUSH", "IN_APP"],
  "preview": "⚠ High Risk Area Ahead: A historically high-risk crime segment is approximately 350m ahead. Exercise heightened vigilance.",
  "timestamp": "2026-09-11T02:00:00Z"
}
```

---

## Delivery Channel Abstraction
All delivery providers implement the `BaseNotificationChannel` interface:
- **`FCMChannel`**: Mobile Push notifications via Firebase Cloud Messaging
- **`TwilioSMSChannel`**: SMS dispatch to emergency phone numbers
- **`SendGridEmailChannel`**: Rich transactional HTML emails
- **`InAppChannel`**: Real-time WebSocket/in-app alert banner & audit record

### Async Processing
In-process `asyncio.Queue` worker ensures non-blocking sub-5ms responses on `/api/notify`. Production upgrade: RabbitMQ / AWS SQS broker.
