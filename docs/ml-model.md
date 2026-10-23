# RAKSHAK AI — MACHINE LEARNING & ANALYTICS SPECIFICATION

## Pipeline Architecture
```text
Raw Incidents ──► Spatial & Temporal Preprocessing ──► Chronological Train/Val/Test Split
                                                              │
                     ┌────────────────────────────────────────┴────────────────────────────────────────┐
                     ▼                                                                                 ▼
      Random Forest Risk Regressor                                                           DBSCAN Spatial Clusters
    (Features: density, hour, weekend, lat/lng)                                             (Haversine Metric in Radians)
                     │                                                                                 │
                     ▼                                                                                 ▼
         Joblib Serialized Model                                                               Danger Radius & Hotspots
```

## Anti-Leakage Training Methodology
1. **Chronological Time-Based Split**: 70% Train, 15% Validation, 15% Test sorted strictly by incident timestamp. No future data is ever visible during model training.
2. **Rolling Density Calculation**: Historical density is calculated strictly using past observations relative to the incident timestamp.
3. **No Target Leakage**: Target risk values are never derived from features passed as inputs to the model.

## Model Evaluation Metrics
- **Model Version**: `1.0.0-rf-demo`
- **Algorithm**: Scikit-Learn `RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_split=4)`
- **Mean Absolute Error (MAE)**: `3.05`
- **Root Mean Squared Error (RMSE)**: `3.85`
- **R² Score**: `0.9762`
- **Training Dataset Size**: 3,000 observations across Delhi NCR coordinates.

## DBSCAN Spatial Clustering
- **Distance Metric**: `haversine` (coordinates transformed to radians).
- **Default Epsilon (`eps_km`)**: 0.75 km (~117.7 microradians).
- **Minimum Samples (`min_samples`)**: 4 incidents.
- **Output**: Hotspot ID, Centroid [Lat, Lng], Maximum cluster radius (meters), Incident count, Dominant crime categories, Severity score.

## Fallback & Graceful Degradation
- If Python FastAPI service is offline or unreachable, the Node.js backend circuit breaker activates.
- The deterministic `riskEngine` renormalizes weights and adjusts confidence ratings, ensuring 0% platform downtime.
- In-memory cache ensures high-frequency requests avoid repetitive clustering computation.
