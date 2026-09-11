# Mobile Application Architecture Specification
**Crime Alert Map (Rakshak AI) — Android & iOS Client**
*Framework: Flutter 3.x (Dart 3.x) with Cross-Platform Native Compilation*

---

## 1. Mobile Architectural Blueprint

```
mobile/
├── lib/
│   ├── main.dart                      # Application Entry Point & ProviderScope
│   ├── core/
│   │   ├── config/                    # API Endpoints, Environment Configuration
│   │   ├── constants/                 # UI Colors, Themes, Typography, Spatial Bounds
│   │   ├── errors/                    # AppFailure, NetworkException, LocationException
│   │   ├── network/                   # Dio Client with JWT Interceptors & Retry Logic
│   │   └── utils/                     # Formatters, Distance Math, Geolocation Helpers
│   ├── features/
│   │   ├── auth/                      # Login, Registration, OTP, Field Selector
│   │   ├── map/                       # Live MapLibre / Google Maps Layer Controller
│   │   ├── navigation/                # Route Planner, Turn-by-Turn GPS Tracker
│   │   ├── safety_advisor/            # Risk Score Card, Hotspot Alert Banners
│   │   ├── emergency_sos/             # One-Touch SOS, Geoshare, 112 Dispatch
│   │   ├── incident_report/           # Crowdsourced Report Form, Camera/GPS Picker
│   │   ├── ai_copilot/                # Supervisor Agent Voice & Text Chat
│   │   ├── settings/                  # Language (Hindi/English), Permissions, Privacy
│   │   └── data_provenance/           # Data Source Inspector & Coverage Matrix
│   └── shared/
│       ├── widgets/                   # Glassmorphic Cards, Badges, Buttons, Sliders
│       └── services/                  # Background Geofencing, SQLite Offline Cache
```

---

## 2. State Management & Data Flow Architecture

The Flutter mobile application leverages **Riverpod 2.x** with declarative state machines:

```mermaid
flowchart TD
    subgraph UI_Layer ["Flutter UI Widget Layer"]
        SCREEN_MAP[LiveMapScreen]
        SCREEN_NAV[NavigationRouteScreen]
        SCREEN_SOS[EmergencySOSModal]
        SCREEN_CHAT[CopilotChatScreen]
    end

    subgraph State_Controllers ["Riverpod StateNotifier Providers"]
        AUTH_PROV[AuthStateProvider]
        LOC_PROV[UserLocationStreamProvider]
        ROUTE_PROV[SafetyRouteNotifier]
        HOTSPOT_PROV[NearbyHotspotsProvider]
        SOS_PROV[EmergencySOSController]
    end

    subgraph Services_Layer ["Device & Remote Services"]
        GEO_SVC[Geolocator & Background Location Plugin]
        DIO_SVC[FastAPI Dio REST Client]
        DB_SVC[Isar / SQLite Offline Cache Database]
        TTS_SVC[FlutterTTS Audio Guidance Engine]
    end

    SCREEN_MAP <--> LOC_PROV & HOTSPOT_PROV
    SCREEN_NAV <--> ROUTE_PROV
    SCREEN_SOS <--> SOS_PROV
    SCREEN_CHAT <--> ROUTE_PROV

    LOC_PROV <--> GEO_SVC
    ROUTE_PROV <--> DIO_SVC & DB_SVC
    HOTSPOT_PROV <--> DIO_SVC & DB_SVC
    ROUTE_PROV --> TTS_SVC
```

---

## 3. Emergency / SOS Flow (Guarded Explicit Confirmation)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant MobileUI as SOS Button (Hold 2s)
    participant GuardModal as Explicit Confirmation Modal (3s Countdown)
    participant LocalDispatch as SMS / WhatsApp Geoshare
    participant Backend as Rakshak Emergency Dispatch API

    User->>MobileUI: Press & Hold SOS Button (2 seconds)
    MobileUI->>GuardModal: Display 3-Second Abort Countdown with Haptic Vibration
    alt User Aborts
        User->>GuardModal: Tap "Cancel / False Alarm"
        GuardModal-->>MobileUI: Reset state (Zero data transmitted)
    else Countdown Expires / User Confirms
        GuardModal->>Backend: POST /api/v1/sos/trigger {lat, lon, battery, user_id}
        GuardModal->>LocalDispatch: Broadcast SMS with Live GPS Link to Trusted Contacts
        Backend-->>MobileUI: Return Nearest Police Station (112) & Hospital POI details
        MobileUI-->>User: Visual Beacon Active + One-Tap Call to 112 Police Control Room
    end
```

---

## 4. Offline Map & Route Resilience

To maintain safety functionality in remote highway dead-zones:
1. **Recent Routes Caching**: Actively calculated safe routes are serialized to encrypted local SQLite/Isar storage.
2. **Offline POI Boundary**: Nearest Police Stations and Hospitals within a $15\text{ km}$ radius are cached upon route departure.
3. **Transparent Indicator**: When network connectivity is lost, the app clearly displays:
   `⚠️ OFFLINE MODE — Displaying Cached Safety Data from 2026-09-11 14:30. GPS Navigation Active.`
