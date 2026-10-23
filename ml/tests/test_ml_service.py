"""
Rakshak AI ML Microservice Unit Tests
"""
import pytest
from inference.risk_predictor import predict_corridor_risk, load_model
from inference.dbscan_hotspots import identify_hotspots

def test_model_loaded():
    model, metadata = load_model()
    assert model is not None
    assert metadata is not None
    assert 'metrics' in metadata
    assert 'features' in metadata

def test_risk_prediction_bounds():
    features = {
        'latitude': 28.6139,
        'longitude': 77.2090,
        'crimeDensity': 3.5,
        'historicalCrimeCount': 12,
        'hour': 23,
        'dayOfWeek': 5
    }
    result = predict_corridor_risk(features)
    assert result['success'] is True
    assert 0.0 <= result['riskScore'] <= 100.0
    assert result['riskLevel'] in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

def test_dbscan_hotspots_clustering():
    # Create cluster of 5 crimes around Connaught Place
    cluster_crimes = [
        {'id': f'c-{i}', 'latitude': 28.6310 + (i * 0.001), 'longitude': 77.2190 + (i * 0.001), 'severity': 'HIGH', 'category': 'ROBBERY'}
        for i in range(5)
    ]
    # Plus 1 distant outlier crime
    cluster_crimes.append(
        {'id': 'c-outlier', 'latitude': 28.9500, 'longitude': 77.9500, 'severity': 'LOW', 'category': 'THEFT'}
    )

    hotspots = identify_hotspots(cluster_crimes, eps_km=0.5, min_samples=4)
    assert len(hotspots) >= 1
    assert hotspots[0]['crimeCount'] >= 4
    assert 'ROBBERY' in hotspots[0]['dominantCrimeTypes']

def test_empty_crimes_hotspots():
    hotspots = identify_hotspots([], eps_km=0.5, min_samples=4)
    assert hotspots == []
