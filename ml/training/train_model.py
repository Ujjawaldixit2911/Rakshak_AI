"""
Rakshak AI - ML Model Training Pipeline
Trains a Random Forest Risk Estimator using time-based splitting (No temporal leakage).
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

FEATURE_NAMES = [
    'latitude',
    'longitude',
    'crimeDensity',
    'historicalCrimeCount',
    'hour',
    'dayOfWeek',
    'isWeekend',
    'isNight'
]

def generate_synthetic_training_data(n_samples=2500):
    """
    Generate synthetic geospatial corridor incident data for Delhi NCR region.
    All synthetic data is marked clearly as DEMO DATA.
    """
    np.random.seed(42)
    start_date = datetime(2025, 1, 1)

    records = []
    for i in range(n_samples):
        # Time progression
        days_offset = int(i / (n_samples / 365))
        timestamp = start_date + timedelta(days=days_offset, hours=np.random.randint(0, 24), minutes=np.random.randint(0, 60))

        # Coordinates around Delhi NCR [28.45 - 28.75, 77.05 - 77.35]
        lat = 28.6139 + np.random.normal(0, 0.08)
        lng = 77.2090 + np.random.normal(0, 0.08)

        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0
        is_night = 1 if (hour >= 21 or hour <= 5) else 0

        # Density and incident patterns
        density = max(0.0, np.random.exponential(2.5))
        hist_count = int(density * np.random.uniform(2, 8))

        # Ground truth risk formula for training target (0 to 100)
        base_risk = (
            15.0 +
            (density * 7.5) +
            (is_night * 18.0) +
            (is_weekend * 8.0) +
            (min(50, hist_count) * 0.8) +
            np.random.normal(0, 3.5)
        )
        target_risk = float(np.clip(base_risk, 0.0, 100.0))

        records.append({
            'timestamp': timestamp,
            'latitude': lat,
            'longitude': lng,
            'crimeDensity': density,
            'historicalCrimeCount': hist_count,
            'hour': hour,
            'dayOfWeek': day_of_week,
            'isWeekend': is_weekend,
            'isNight': is_night,
            'targetRisk': target_risk
        })

    df = pd.DataFrame(records)
    # Sort chronologically to prevent temporal leakage
    df = df.sort_values('timestamp').reset_index(drop=True)
    return df

def train_and_evaluate():
    print("[ML Pipeline] Generating chronologically sorted training dataset...")
    df = generate_synthetic_training_data(n_samples=3000)

    # Time-based split: 70% Train, 15% Validation, 15% Test
    n = len(df)
    train_idx = int(n * 0.70)
    val_idx = int(n * 0.85)

    train_df = df.iloc[:train_idx]
    val_df = df.iloc[train_idx:val_idx]
    test_df = df.iloc[val_idx:]

    print(f"[ML Pipeline] Split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)} (Strictly time-ordered)")

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df['targetRisk']

    X_test = test_df[FEATURE_NAMES]
    y_test = test_df['targetRisk']

    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    # Evaluate on held-out test set
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    print(f"[ML Pipeline] Evaluation Metrics: MAE={mae:.2f}, RMSE={rmse:.2f}, R2={r2:.4f}")

    # Ensure output directory exists
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, 'random_forest_risk_model.joblib')
    joblib.dump(model, model_path)
    print(f"[ML Pipeline] Saved model artifact to: {model_path}")

    metadata = {
        'modelVersion': '1.0.0-rf-demo',
        'modelType': 'RandomForestRegressor',
        'trainedAt': datetime.now().isoformat(),
        'datasetSize': len(df),
        'features': FEATURE_NAMES,
        'metrics': {
            'mae': round(mae, 3),
            'rmse': round(rmse, 3),
            'r2': round(r2, 4)
        },
        'hyperparameters': {
            'n_estimators': 100,
            'max_depth': 12,
            'min_samples_split': 4
        },
        'isDemo': True,
        'disclaimer': 'DEMO MODEL - TRAINED FOR DEMO AND SYNTHETIC VALIDATION. NOT FOR REAL-WORLD LIFE-CRITICAL USE.'
    }

    metadata_path = os.path.join(models_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"[ML Pipeline] Saved model metadata to: {metadata_path}")
    return model, metadata

if __name__ == '__main__':
    train_and_evaluate()
