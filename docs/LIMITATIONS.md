# System & Data Limitations
**Crime Alert Map (Rakshak AI)**

---

## 1. Data Availability & Reporting Latency Limitations

1. **Reporting Delay of National Statistics**: Annual NCRB compendia ("Crime in India") are published with a 12 to 18-month reporting latency. The system reflects official historical trends rather than instant real-time FIR police dispatches across all 700+ districts.
2. **Underreporting Bias**: Historical crime statistics reflect recorded police FIRs. Sociological studies show that certain crime types (e.g., street harassment, minor theft) suffer from systemic underreporting in specific regions. The platform accounts for this by integrating crowdsourced hazard reports with multi-user verification.
3. **Urban vs. Rural Telemetry Disparity**: Metropolitan cities (Delhi, Mumbai, Bengaluru, Hyderabad) possess dense OpenStreetMap street lighting and POI telemetry, while remote rural roads may lack granular streetlight tags (addressed by fallback distance modeling).

---

## 2. Algorithmic & Modeling Limitations

1. **Probabilistic Risk vs. Guarantee**: The Crime Alert Risk Score (0–100) models probabilistic spatial exposure based on past patterns. It does **NOT** guarantee that a crime will occur on a high-risk route, nor does it guarantee that a low-risk route is 100% immune from unpredictable events.
2. **Dynamic Road Closures & Live Traffic**: While the engine models static physical infrastructure and safety penalties, extreme unpredictable events (flash floods, spontaneous protests) require real-time police advisory integration.
3. **Emergency Response Disclaimer**: The app provides direct one-tap routing to nearest police stations and emergency contacts, but does not operate as a private armed security dispatch. All emergency dispatches defer to official national services (**112 / 100**).
