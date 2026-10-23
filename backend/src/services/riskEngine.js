/**
 * Rakshak AI Deterministic Risk Engine
 * Pure mathematical functions for route and segment risk scoring.
 * No I/O, no DB calls, fully deterministic and unit-testable.
 */
const config = require('../config');

/**
 * Normalise a raw value to [0, 100] using a soft-saturating logistic / hyperbolic function
 * to prevent outliers while avoiding bad relative scales on sparse data.
 * @param {number} value - Raw input value
 * @param {number} midpoint - Value where score reaches 50
 * @returns {number} Score bounded between 0 and 100
 */
function saturateScore(value, midpoint) {
  if (value <= 0 || isNaN(value)) return 0;
  // S-curve: 100 * (1 - exp(-0.693 * (value / midpoint)))
  const score = 100 * (1 - Math.exp(-0.693 * (value / midpoint)));
  return Math.min(100, Math.max(0, Math.round(score * 100) / 100));
}

/**
 * Compute exponential recency weight for an incident
 * @param {Date|string|number} incidentDate 
 * @param {Date} referenceDate 
 * @param {number} halfLifeDays 
 * @returns {number} Weight between 0 and 1
 */
function computeRecencyWeight(incidentDate, referenceDate = new Date(), halfLifeDays = config.RECENCY_HALF_LIFE_DAYS) {
  const incTime = new Date(incidentDate).getTime();
  const refTime = new Date(referenceDate).getTime();
  if (isNaN(incTime)) return 0.5;
  const daysDiff = Math.max(0, (refTime - incTime) / (1000 * 60 * 60 * 24));
  const decayConstant = Math.LN2 / halfLifeDays;
  return Math.exp(-decayConstant * daysDiff);
}

/**
 * Determine qualitative risk level from numeric score
 * @param {number} riskScore 
 * @param {number} confidence 
 * @returns {string} LOW | MEDIUM | HIGH | CRITICAL | INSUFFICIENT_DATA
 */
function getRiskLevel(riskScore, confidence = 1.0) {
  if (confidence < config.MIN_DATA_CONFIDENCE) {
    return 'INSUFFICIENT_DATA';
  }
  if (riskScore <= config.RISK_THRESHOLDS.LOW[1]) return 'LOW';
  if (riskScore <= config.RISK_THRESHOLDS.MEDIUM[1]) return 'MEDIUM';
  if (riskScore <= config.RISK_THRESHOLDS.HIGH[1]) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Calculate pure risk score for a set of crime incidents along a route corridor
 * @param {Object} params
 * @param {Array} params.crimes - Incidents in route corridor
 * @param {number} params.distanceMeters - Total route distance
 * @param {number} params.hotspotIntersections - Number of hotspot intersections
 * @param {number|null} [params.mlRiskScore=null] - Optional ML predicted risk (0-100)
 * @param {Object} [params.customWeights=null]
 * @returns {Object} Comprehensive risk breakdown
 */
function evaluateRouteRisk({
  crimes = [],
  distanceMeters = 1000,
  hotspotIntersections = 0,
  mlRiskScore = null,
  customWeights = null
}) {
  const distanceKm = Math.max(0.2, distanceMeters / 1000);
  const crimeCount = crimes.length;

  let totalSeverityScore = 0;
  let highSeverityCrimeCount = 0;
  let timeDecayedSeveritySum = 0;
  let verifiedCount = 0;
  let demoCount = 0;

  const now = new Date();

  for (const crime of crimes) {
    const sev = (crime.severity || 'MEDIUM').toUpperCase();
    const weight = config.SEVERITY_WEIGHTS[sev] || 2;
    totalSeverityScore += weight;

    if (sev === 'HIGH' || sev === 'CRITICAL') {
      highSeverityCrimeCount++;
    }

    const recency = computeRecencyWeight(crime.date || crime.createdAt, now);
    timeDecayedSeveritySum += (weight * recency);

    if (crime.verificationStatus === 'VERIFIED' || crime.verified) {
      verifiedCount++;
    }
    if (crime.isDemo) {
      demoCount++;
    }
  }

  // Raw metrics
  const crimeDensity = crimeCount / distanceKm; // crimes per km
  const averageSeverity = crimeCount > 0 ? totalSeverityScore / crimeCount : 0;
  const recentCrimeExposure = crimeCount > 0 ? timeDecayedSeveritySum / distanceKm : 0;

  // Normalised sub-components (0-100)
  // Calibrated reference midpoints based on urban corridor benchmarks
  const frequencyScore = saturateScore(crimeCount, 10);
  const severityScore = saturateScore(totalSeverityScore, 25);
  const densityScore = saturateScore(crimeDensity, 4.0); // 4 crimes/km = 50 score
  const hotspotScore = saturateScore(hotspotIntersections * 30, 40);
  const recencyScore = saturateScore(recentCrimeExposure, 6.0);

  // Weights configuration & normalization
  const baseWeights = customWeights || { ...config.RISK_COMPONENT_WEIGHTS };
  let activeWeights = { ...baseWeights };

  let isMlAvailable = typeof mlRiskScore === 'number' && !isNaN(mlRiskScore) && mlRiskScore >= 0;
  let mlScore = isMlAvailable ? Math.min(100, Math.max(0, mlRiskScore)) : 0;

  if (!isMlAvailable) {
    const { ml, ...nonMlWeights } = activeWeights;
    const sumNonMl = Object.values(nonMlWeights).reduce((a, b) => a + b, 0);
    const scale = sumNonMl > 0 ? 1.0 / sumNonMl : 1.0;
    activeWeights = {
      frequency: nonMlWeights.frequency * scale,
      severity: nonMlWeights.severity * scale,
      density: nonMlWeights.density * scale,
      hotspot: nonMlWeights.hotspot * scale,
      recency: nonMlWeights.recency * scale,
      ml: 0
    };
  }

  // Composite Deterministic Score
  const overallRiskRaw = (
    frequencyScore * activeWeights.frequency +
    severityScore * activeWeights.severity +
    densityScore * activeWeights.density +
    hotspotScore * activeWeights.hotspot +
    recencyScore * activeWeights.recency +
    (isMlAvailable ? mlScore * activeWeights.ml : 0)
  );

  const overallRisk = Math.min(100, Math.max(0, Math.round(overallRiskRaw * 10) / 10));
  const safetyScore = Math.round((100 - overallRisk) * 10) / 10;

  // Compute Confidence & Data Quality Notes
  const dataQualityNotes = [];
  let confidenceScore = 0.85;

  if (crimeCount === 0) {
    confidenceScore = 0.35;
    dataQualityNotes.push('No reported crimes recorded in corridor. Risk score reflects low baseline data, not a safety guarantee.');
  } else if (crimeCount < 3) {
    confidenceScore = 0.50;
    dataQualityNotes.push('Sparse crime data in this geographic corridor. Exercise caution.');
  }

  if (crimeCount > 0) {
    const verifiedRatio = verifiedCount / crimeCount;
    if (verifiedRatio < 0.5) {
      confidenceScore *= 0.85;
      dataQualityNotes.push(`${Math.round((1 - verifiedRatio) * 100)}% of corridor reports are community-submitted and pending official verification.`);
    }
  }

  if (!isMlAvailable) {
    confidenceScore *= 0.90;
    dataQualityNotes.push('ML predictive service unavailable; deterministic rule engine active.');
  }

  if (demoCount > 0) {
    dataQualityNotes.push(`Corridor incorporates ${demoCount} DEMO DATA records for testing.`);
  }

  confidenceScore = Math.min(1.0, Math.max(0.1, Math.round(confidenceScore * 100) / 100));

  let confidenceLevel = 'HIGH';
  if (confidenceScore < 0.45) confidenceLevel = 'LOW';
  else if (confidenceScore < 0.75) confidenceLevel = 'MEDIUM';

  const riskLevel = getRiskLevel(overallRisk, confidenceScore);

  return {
    overallRisk,
    safetyScore,
    riskLevel,
    confidence: confidenceScore,
    confidenceLevel,
    isMlAvailable,
    metrics: {
      crimeCount,
      highSeverityCrimeCount,
      crimeDensity: Math.round(crimeDensity * 100) / 100,
      totalSeverityScore,
      averageSeverity: Math.round(averageSeverity * 100) / 100,
      recentCrimeExposure: Math.round(recentCrimeExposure * 100) / 100,
      hotspotIntersections,
      mlRisk: isMlAvailable ? mlScore : null,
      verifiedCrimeRatio: crimeCount > 0 ? Math.round((verifiedCount / crimeCount) * 100) / 100 : 1.0,
      demoCrimeCount: demoCount
    },
    subScores: {
      frequencyScore,
      severityScore,
      densityScore,
      hotspotScore,
      recencyScore,
      mlScore: isMlAvailable ? mlScore : null
    },
    weightsApplied: activeWeights,
    dataQualityNotes
  };
}

/**
 * Score an individual route segment (e.g. 200m)
 */
function evaluateSegmentRisk(segmentCrimes, segmentLengthMeters = config.SEGMENT_LENGTH_M) {
  const result = evaluateRouteRisk({
    crimes: segmentCrimes,
    distanceMeters: segmentLengthMeters,
    hotspotIntersections: 0,
    mlRiskScore: null
  });
  return {
    riskScore: result.overallRisk,
    riskLevel: result.riskLevel,
    crimeCount: segmentCrimes.length,
    highSeverityCount: result.metrics.highSeverityCrimeCount,
    topCategories: [...new Set(segmentCrimes.map(c => c.category || c.crimeType))].slice(0, 3)
  };
}

module.exports = {
  saturateScore,
  computeRecencyWeight,
  getRiskLevel,
  evaluateRouteRisk,
  evaluateSegmentRisk
};
