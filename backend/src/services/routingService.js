/**
 * Rakshak AI Routing Service
 * Multi-route generation (OSRM proxy), corridor spatial analysis, risk scoring, and recommendation optimization.
 */
const axios = require('axios');
const config = require('../config');
const { decodePolyline, segmentRoute, fetchCrimesAlongRoute, haversineDistanceMeters } = require('./geospatialService');
const { evaluateRouteRisk, evaluateSegmentRisk } = require('./riskEngine');
const { predictRisk } = require('./mlServiceClient');
const { explainRecommendedRoute, explainRejectedRoute } = require('./explanationService');

// In-memory route cache: `originLat,originLng:destLat,destLng` -> { routes, expiresAt }
const routeCache = new Map();

/**
 * Generate synthetic alternate path if OSRM returns only 1 route
 */
function createAlternativePath(coords, offsetMultiplier = 1) {
  if (!coords || coords.length < 3) return coords;
  const n = coords.length;
  const midIndex = Math.floor(n / 2);
  const p1 = coords[0];
  const p2 = coords[n - 1];

  // Perpendicular offset
  const dLat = p2[0] - p1[0];
  const dLng = p2[1] - p1[1];
  const perpLat = -dLng * 0.25 * offsetMultiplier;
  const perpLng = dLat * 0.25 * offsetMultiplier;

  return coords.map((pt, idx) => {
    // Parabolic bell envelope
    const factor = Math.sin((Math.PI * idx) / (n - 1));
    return [
      pt[0] + perpLat * factor,
      pt[1] + perpLng * factor
    ];
  });
}

/**
 * Fetch raw route alternatives from OSRM
 */
async function fetchOsrmRoutes(origin, destination) {
  const url = `${config.OSRM_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const response = await axios.get(url, {
    params: {
      alternatives: 'true',
      geometries: 'polyline',
      overview: 'full',
      steps: 'true'
    },
    timeout: 8000
  });

  if (!response.data || response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
    throw new Error(response.data?.message || 'No route found between specified coordinates');
  }

  return response.data.routes;
}

/**
 * Fallback geometry generator when OSRM server is unavailable
 */
function generateFallbackRoutes(origin, destination) {
  const straightDistMeters = haversineDistanceMeters(origin, destination);
  const estDurationSec = Math.round(straightDistMeters / 11.1); // ~40 km/h average speed

  // Generate 15 points along the path
  const baseCoords = [];
  const steps = 15;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    baseCoords.push([
      origin.lat + (destination.lat - origin.lat) * t,
      origin.lng + (destination.lng - origin.lng) * t
    ]);
  }

  const alt1Coords = createAlternativePath(baseCoords, 0.35);
  const alt2Coords = createAlternativePath(baseCoords, -0.35);

  return [
    {
      distance: straightDistMeters,
      duration: estDurationSec,
      geometry: baseCoords,
      isSynthetic: true
    },
    {
      distance: straightDistMeters * 1.15,
      duration: estDurationSec * 1.18,
      geometry: alt1Coords,
      isSynthetic: true
    },
    {
      distance: straightDistMeters * 1.25,
      duration: estDurationSec * 1.30,
      geometry: alt2Coords,
      isSynthetic: true
    }
  ];
}

/**
 * Process and score route alternatives with full spatial risk analysis and explainability
 * @param {Object} origin - { lat, lng, name }
 * @param {Object} destination - { lat, lng, name }
 * @param {Object} options - { safetyMode: 'FAST'|'BALANCED'|'SAFE', safetySlider: 0-1, includeDemo: true }
 */
async function planAndCompareRoutes(origin, destination, options = {}) {
  const {
    safetyMode = 'BALANCED',
    safetySlider = null,
    includeDemo = true,
    corridorRadiusMeters = config.DEFAULT_SEARCH_RADIUS_M
  } = options;

  let rawRoutes = [];

  try {
    const osrmData = await fetchOsrmRoutes(origin, destination);
    rawRoutes = osrmData.map(r => ({
      distance: r.distance,
      duration: r.duration,
      geometry: decodePolyline(r.geometry),
      legs: r.legs
    }));

    // If OSRM returned only 1 route, generate a secondary exploration route for comparison if distance > 1km
    if (rawRoutes.length === 1 && rawRoutes[0].geometry.length > 5) {
      const altCoords = createAlternativePath(rawRoutes[0].geometry, 0.4);
      rawRoutes.push({
        distance: rawRoutes[0].distance * 1.12,
        duration: rawRoutes[0].duration * 1.16,
        geometry: altCoords,
        isSyntheticAlternative: true
      });
    }
  } catch (osrmError) {
    console.warn(`[OSRM Routing Fallback] ${osrmError.message}. Using simulated geometric paths.`);
    rawRoutes = generateFallbackRoutes(origin, destination);
  }

  // Analyze and score each route candidate
  const analyzedRoutes = [];

  for (let i = 0; i < rawRoutes.length; i++) {
    const route = rawRoutes[i];
    const coords = route.geometry;
    const routeId = `route-alt-${i + 1}`;

    // 1. Fetch crimes along corridor using MongoDB 2dsphere index
    const corridorCrimes = await fetchCrimesAlongRoute(coords, corridorRadiusMeters, includeDemo);

    // 2. Segment route into 200m blocks and score each segment
    const segments = segmentRoute(coords, config.SEGMENT_LENGTH_M);
    const scoredSegments = segments.map(seg => {
      // Find crimes closest to this segment
      const segCrimes = corridorCrimes.filter(c => {
        const d = haversineDistanceMeters({ lat: c.latitude, lng: c.longitude }, seg.midpoint);
        return d <= corridorRadiusMeters;
      });
      const segRisk = evaluateSegmentRisk(segCrimes, seg.lengthMeters);
      return {
        ...seg,
        ...segRisk
      };
    });

    // 3. Request ML Risk prediction (if ML service is running)
    const mlResponse = await predictRisk({
      latitude: coords[0] ? coords[0][0] : origin.lat,
      longitude: coords[0] ? coords[0][1] : origin.lng,
      crimeDensity: corridorCrimes.length / Math.max(0.5, route.distance / 1000),
      historicalCrimeCount: corridorCrimes.length,
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    });

    // 4. Deterministic Risk Scoring
    const riskAnalysis = evaluateRouteRisk({
      crimes: corridorCrimes,
      distanceMeters: route.distance,
      hotspotIntersections: scoredSegments.filter(s => s.highSeverityCount > 0).length,
      mlRiskScore: mlResponse.available ? mlResponse.mlRisk : null
    });

    analyzedRoutes.push({
      routeId,
      index: i,
      name: i === 0 ? 'Primary Route' : `Alternative ${i}`,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      durationFormatted: `${Math.round(route.duration / 60)} mins`,
      distanceFormatted: `${(route.distance / 1000).toFixed(1)} km`,
      coordinates: coords,
      segments: scoredSegments,
      corridorCrimesCount: corridorCrimes.length,
      overallRisk: riskAnalysis.overallRisk,
      safetyScore: riskAnalysis.safetyScore,
      riskLevel: riskAnalysis.riskLevel,
      confidence: riskAnalysis.confidence,
      confidenceLevel: riskAnalysis.confidenceLevel,
      riskAnalysis,
      labels: []
    });
  }

  // Identify Fastest and Safest Routes
  const fastest = [...analyzedRoutes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
  const safest = [...analyzedRoutes].sort((a, b) => a.overallRisk - b.overallRisk)[0];

  fastest.labels.push('Fastest');
  if (!safest.labels.includes('Safest')) {
    safest.labels.push('Lower-risk / Safest');
  }

  // Determine weight configuration based on user safety mode or slider
  let wSafety = 0.5;
  let wTime = 0.5;

  if (typeof safetySlider === 'number' && safetySlider >= 0 && safetySlider <= 1) {
    wSafety = safetySlider;
    wTime = 1.0 - safetySlider;
  } else {
    const modeConfig = config.SAFETY_MODE_WEIGHTS[safetyMode] || config.SAFETY_MODE_WEIGHTS.BALANCED;
    wSafety = modeConfig.safety;
    wTime = modeConfig.time;
  }

  // Compute composite score for recommendation
  // TimeScore: 100 for fastest route, scaled down for slower ones
  for (const r of analyzedRoutes) {
    const timeRatio = fastest.durationSeconds / Math.max(1, r.durationSeconds);
    const timeScore = Math.min(100, Math.max(0, Math.round(timeRatio * 100)));
    const finalScore = Math.round((wSafety * r.safetyScore + wTime * timeScore) * 10) / 10;

    r.timeScore = timeScore;
    r.finalScore = finalScore;
  }

  // Sort by finalScore descending to pick recommendation
  const sortedByRecommendation = [...analyzedRoutes].sort((a, b) => b.finalScore - a.finalScore);
  const recommended = sortedByRecommendation[0];
  if (!recommended.labels.includes('Recommended')) {
    recommended.labels.push('Recommended');
  }

  // Label Balanced route if not already fastest or safest
  for (const r of analyzedRoutes) {
    if (r.routeId !== fastest.routeId && r.routeId !== safest.routeId && r.labels.length === 0) {
      r.labels.push('Balanced');
    }
  }

  // Generate Explainability ("Why this route?" & "Why not this route?")
  const recommendationReasons = explainRecommendedRoute(recommended, analyzedRoutes, safetyMode);
  recommended.reasons = recommendationReasons;

  for (const r of analyzedRoutes) {
    if (r.routeId !== recommended.routeId) {
      r.rejectionReasons = explainRejectedRoute(r, recommended);
    }
  }

  return {
    origin,
    destination,
    safetyMode,
    weightsApplied: { wSafety, wTime },
    recommendedRouteId: recommended.routeId,
    routes: analyzedRoutes,
    explanation: {
      whyThisRoute: recommendationReasons,
      recommendedRouteId: recommended.routeId
    },
    meta: {
      totalRoutes: analyzedRoutes.length,
      computedAt: new Date().toISOString(),
      disclaimer: 'Estimates are based on available historical and recent data, which may be incomplete, delayed or underreported. This is not a guarantee of safety.'
    }
  };
}

module.exports = {
  planAndCompareRoutes,
  fetchOsrmRoutes
};
