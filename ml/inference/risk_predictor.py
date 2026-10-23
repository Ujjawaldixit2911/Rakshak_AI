"""
Rakshak AI - ML Risk Predictor
Inference module for Random Forest risk estimator.
"""
import os
import json
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'random_forest_risk_model.joblib')
METADATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'model_metadata.json')

_model = None
_metadata = None

def load_model():
    global _model, _metadata
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            if os.path.exists(METADATA_PATH):
                with open(METADATA_PATH, 'r') as f:
                    _metadata = json.load(f)
        except Exception as e:
            print(f"[ML Predictor Error] Could not load model: {e}")
            _model = None
    return _model, _metadata

def predict_corridor_risk(features_dict):
    """
    Predict risk score [0-100] given features dictionary.
    """
    model, metadata = load_model()
    if model is None:
        return {
            'success': False,
            'error': 'ML model artifact not loaded or missing'
        }

    lat = float(features_dict.get('latitude', 28.6139))
    lng = float(features_dict.get('longitude', 77.2090))
    density = float(features_dict.get('crimeDensity', 0.0))
    hist_count = int(features_dict.get('historicalCrimeCount', 0))
    hour = int(features_dict.get('hour', 12))
    day_of_week = int(features_dict.get('dayOfWeek', 2))

    is_weekend = 1 if day_of_week in [5, 6] else 0
    is_night = 1 if (hour >= 21 or hour <= 5) else 0

    feature_vector = np.array([[
        lat,
        lng,
        density,
        hist_count,
        hour,
        day_of_week,
        is_weekend,
        is_night
    ]])

    raw_prediction = float(model.predict(feature_vector)[0])
    bounded_risk = max(0.0, min(100.0, round(raw_prediction, 1)))

    risk_level = 'LOW'
    if bounded_risk > 75:
        risk_level = 'CRITICAL'
    elif bounded_risk > 50:
        risk_level = 'HIGH'
    elif bounded_risk > 25:
        risk_level = 'MEDIUM'

    return {
        'success': True,
        'riskScore': bounded_risk,
        'riskLevel': risk_level,
        'modelVersion': metadata.get('modelVersion', '1.0.0') if metadata else '1.0.0',
        'isDemo': True
    }
