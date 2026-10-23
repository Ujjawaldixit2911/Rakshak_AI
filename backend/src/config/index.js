/**
 * Rakshak AI Configuration - Single Source of Truth
 */
require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rakshak_ai',
  JWT_SECRET: process.env.JWT_SECRET || 'rakshak-ai-super-secret-jwt-key-change-in-prod-38491823',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  OSRM_URL: process.env.OSRM_URL || 'https://router.project-osrm.org',
  NOMINATIM_URL: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
  EMERGENCY_NUMBER: process.env.EMERGENCY_NUMBER || '112',

  // Geospatial & Risk Constants
  SEARCH_RADII_M: [250, 500, 1000],
  DEFAULT_SEARCH_RADIUS_M: 500,
  SEGMENT_LENGTH_M: 200,
  RECENCY_HALF_LIFE_DAYS: 90,

  SEVERITY_WEIGHTS: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 4,
    CRITICAL: 8
  },

  RISK_THRESHOLDS: {
    LOW: [0, 25],
    MEDIUM: [26, 50],
    HIGH: [51, 75],
    CRITICAL: [76, 100]
  },

  // Component weights sum to 1.0; automatically renormalized if ML is unavailable
  RISK_COMPONENT_WEIGHTS: {
    frequency: 0.20,
    severity: 0.25,
    density: 0.15,
    hotspot: 0.15,
    recency: 0.15,
    ml: 0.10
  },

  SAFETY_MODE_WEIGHTS: {
    FAST: { safety: 0.2, time: 0.8 },
    BALANCED: { safety: 0.5, time: 0.5 },
    SAFE: { safety: 0.8, time: 0.2 }
  },

  DBSCAN_DEFAULTS: {
    eps_km: 0.75,
    min_samples: 4
  },

  MIN_CRIMES_FOR_HOTSPOTS: 4,
  MIN_CRIMES_FOR_ML: 10,
  MIN_DATA_CONFIDENCE: 0.2,

  // Cache TTL in seconds
  CACHE_TTL: {
    geocode: 86400,   // 24 hours
    route: 3600,      // 1 hour
    crimeQuery: 300   // 5 minutes
  },

  // Max duration deviation cap (in minutes) for safe routes vs fastest
  MAX_EXTRA_DURATION_MINS_CAP: 25,

  // Live Navigation Deviation threshold in meters
  DEVIATION_THRESHOLD_METERS: 75,
  DEVIATION_CONSECUTIVE_SAMPLES: 3
};
