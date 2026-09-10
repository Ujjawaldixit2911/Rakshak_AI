# What-If Simulator Module (Rakshak AI)

## Architectural Role
The **What-If Simulator Module** is an orchestration and interaction layer. It re-evaluates route safety scores and crime risk profiles under dynamic hypothetical conditions (departure time, travel mode, lighting conditions, weather severity, and police patrol density).

### Pure Composition Layer
- **Zero Database Ownership**: Does not possess or query any database tables directly.
- **Service Orchestration**: Composes calls to Route Compare (`POST /api/routes/compare`), Safety Scoring (`POST /api/safety-score/calculate`), and AI Briefing (`POST /api/ai/briefing`).

---

## API Specification

### POST `/api/simulator/what-if`

#### Request Body
```json
{
  "source": { "lat": 28.6692, "lng": 77.4538 },
  "destination": { "lat": 28.5355, "lng": 77.3910 },
  "scenario": {
    "departureTime": "2026-09-11T23:30:00+05:30",
    "travelMode": "walking",
    "lightingCondition": "poor",
    "weatherCondition": "heavy_rain",
    "policePatrol": "standard"
  }
}
```

#### Response Body
```json
{
  "baselineScore": 84.5,
  "simulatedScore": 42.1,
  "scoreDelta": -42.4,
  "percentageChange": -50.2,
  "baselineBand": "High",
  "simulatedBand": "Low",
  "factors": [
    {
      "factor": "Time of Day",
      "selectedOption": "2026-09-11T23:30:00+05:30",
      "multiplier": 0.65,
      "impactPercent": -35.0,
      "description": "Hourly safety factor (0.65x)"
    },
    {
      "factor": "Travel Mode",
      "selectedOption": "Walking",
      "multiplier": 0.78,
      "impactPercent": -22.0,
      "description": "Walking mode risk exposure"
    },
    {
      "factor": "Street Lighting",
      "selectedOption": "Poor",
      "multiplier": 0.82,
      "impactPercent": -18.0,
      "description": "Illumination condition: poor"
    },
    {
      "factor": "Weather Visibility",
      "selectedOption": "Heavy Rain",
      "multiplier": 0.86,
      "impactPercent": -14.0,
      "description": "Atmospheric condition: heavy_rain"
    },
    {
      "factor": "Police Patrol Density",
      "selectedOption": "Standard",
      "multiplier": 1.0,
      "impactPercent": 0.0,
      "description": "Law enforcement presence: standard"
    }
  ],
  "aiRecommendation": "High Risk Warning: Safety Score drops by -42.4 pts (-50.2% decline). Traveling during late hours by walking in poor lighting substantially increases vulnerability. Switch to Safest Route or travel before 20:00.",
  "simulatedRoutes": { ... }
}
```
