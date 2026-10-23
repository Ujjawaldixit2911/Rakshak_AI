/**
 * Rakshak AI Python ML Service HTTP Client
 * Connects to Python FastAPI ML service with circuit-breaker style fault tolerance.
 * Ensures Node.js backend NEVER crashes if Python ML is offline or errors.
 */
const axios = require('axios');
const config = require('../config');

let isCircuitOpen = false;
let lastFailureTime = 0;
const CIRCUIT_RESET_TIMEOUT_MS = 30000; // Retry after 30 seconds if service was down

/**
 * Predict ML risk score for route/segment features
 */
async function predictRisk(features) {
  const now = Date.now();
  if (isCircuitOpen && (now - lastFailureTime < CIRCUIT_RESET_TIMEOUT_MS)) {
    return {
      available: false,
      mlRisk: null,
      error: 'ML service temporarily bypassed due to previous failure'
    };
  }

  try {
    const response = await axios.post(`${config.ML_SERVICE_URL}/predict-risk`, features, {
      timeout: 3000
    });

    isCircuitOpen = false;
    return {
      available: true,
      mlRisk: response.data.riskScore,
      riskLevel: response.data.riskLevel,
      modelVersion: response.data.modelVersion
    };
  } catch (err) {
    console.warn(`[ML Service Unavailable] ${err.message}. Gracefully falling back to deterministic risk engine.`);
    isCircuitOpen = true;
    lastFailureTime = Date.now();
    return {
      available: false,
      mlRisk: null,
      error: err.message
    };
  }
}

/**
 * Request DBSCAN clustering from Python ML service
 */
async function computeHotspots(crimes, epsKm = config.DBSCAN_DEFAULTS.eps_km, minSamples = config.DBSCAN_DEFAULTS.min_samples) {
  if (!crimes || crimes.length < config.MIN_CRIMES_FOR_HOTSPOTS) {
    return {
      available: true,
      hotspots: [],
      message: 'Insufficient crime incidents to establish DBSCAN clusters'
    };
  }

  try {
    const payload = {
      crimes: crimes.map(c => ({
        id: c.crimeId || c._id,
        latitude: c.latitude,
        longitude: c.longitude,
        severity: c.severity || 'MEDIUM',
        category: c.category || 'THEFT'
      })),
      eps_km: epsKm,
      min_samples: minSamples
    };

    const response = await axios.post(`${config.ML_SERVICE_URL}/hotspots`, payload, {
      timeout: 4000
    });

    return {
      available: true,
      hotspots: response.data.hotspots || []
    };
  } catch (err) {
    console.warn(`[ML Hotspots Unavailable] ${err.message}. Returning fallback empty clusters.`);
    return {
      available: false,
      hotspots: [],
      error: err.message
    };
  }
}

/**
 * Check ML Service Health
 */
async function checkMLHealth() {
  try {
    const response = await axios.get(`${config.ML_SERVICE_URL}/health`, { timeout: 2000 });
    return {
      status: response.data.status || 'OK',
      modelLoaded: response.data.modelLoaded || false,
      version: response.data.version || '1.0.0'
    };
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      modelLoaded: false,
      error: err.message
    };
  }
}

module.exports = {
  predictRisk,
  computeHotspots,
  checkMLHealth
};
