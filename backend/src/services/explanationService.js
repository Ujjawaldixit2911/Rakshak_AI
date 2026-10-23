/**
 * Rakshak AI Explainability Service
 * Generates transparent, verifiable explanations for "Why this route?" and "Why not this route?".
 * All numbers and assertions are derived directly from deterministic computed values.
 */

/**
 * Generate structured reasons why a route was selected as the recommendation
 */
function explainRecommendedRoute(recommendedRoute, allRoutes = [], safetyMode = 'BALANCED') {
  const reasons = [];
  const recRisk = recommendedRoute.riskAnalysis || {};
  const recMetrics = recRisk.metrics || {};
  const isOnlyRoute = allRoutes.length <= 1;

  if (isOnlyRoute) {
    reasons.push({
      code: 'ONLY_ROUTE_AVAILABLE',
      text: 'Only a single viable path exists between the selected origin and destination.',
      value: 1
    });
    return reasons;
  }

  // Find fastest route and other alternatives
  const fastestRoute = [...allRoutes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
  const isAlsoFastest = fastestRoute.routeId === recommendedRoute.routeId;

  if (isAlsoFastest && recommendedRoute.overallRisk <= 35) {
    reasons.push({
      code: 'OPTIMAL_DOUBLE_ADVANTAGE',
      text: `Optimal route: Offers both the fastest transit time (${Math.round(recommendedRoute.durationSeconds / 60)} mins) and a low estimated risk score (${recommendedRoute.overallRisk}/100).`,
      value: { durationMins: Math.round(recommendedRoute.durationSeconds / 60), risk: recommendedRoute.overallRisk }
    });
  }

  // Crime exposure comparison vs highest risk alternative
  const otherRoutes = allRoutes.filter(r => r.routeId !== recommendedRoute.routeId);
  const worstRiskRoute = otherRoutes.reduce((max, r) => r.overallRisk > max.overallRisk ? r : max, otherRoutes[0]);

  if (worstRiskRoute && worstRiskRoute.overallRisk > recommendedRoute.overallRisk) {
    const riskDelta = Math.round((worstRiskRoute.overallRisk - recommendedRoute.overallRisk) * 10) / 10;
    const crimeDelta = (worstRiskRoute.riskAnalysis?.metrics?.crimeCount || 0) - (recMetrics.crimeCount || 0);

    if (riskDelta >= 5) {
      reasons.push({
        code: 'RISK_REDUCTION',
        text: `Reduces estimated safety risk by ${riskDelta} points compared to alternative routes (${recommendedRoute.overallRisk} vs ${worstRiskRoute.overallRisk}).`,
        value: riskDelta
      });
    }

    if (crimeDelta > 0) {
      reasons.push({
        code: 'LOWER_INCIDENT_EXPOSURE',
        text: `Avoids ${crimeDelta} reported incident(s) present along alternative corridors.`,
        value: crimeDelta
      });
    }
  }

  // High severity crimes avoided
  if (recMetrics.highSeverityCrimeCount === 0) {
    reasons.push({
      code: 'ZERO_HIGH_SEVERITY',
      text: 'Zero high or critical severity incidents recorded along this specific corridor.',
      value: 0
    });
  } else {
    reasons.push({
      code: 'LOW_HIGH_SEVERITY',
      text: `Corridor contains ${recMetrics.highSeverityCrimeCount} high-severity recorded incident(s). Caution advised near flagged segments.`,
      value: recMetrics.highSeverityCrimeCount
    });
  }

  // Hotspot avoidance
  if (recMetrics.hotspotIntersections === 0) {
    reasons.push({
      code: 'AVOIDS_HOTSPOTS',
      text: 'Bypasses all identified historical crime cluster zones (DBSCAN hotspots).',
      value: 0
    });
  }

  // Safety Mode alignment
  if (safetyMode === 'SAFE') {
    const extraTimeMins = !isAlsoFastest ? Math.round((recommendedRoute.durationSeconds - fastestRoute.durationSeconds) / 60) : 0;
    reasons.push({
      code: 'MAX_SAFETY_PRIORITY',
      text: extraTimeMins > 0
        ? `Prioritized maximum safety (+${extraTimeMins} min travel time traded for lowest corridor risk).`
        : 'Achieves maximum safety without any travel time penalty.',
      value: extraTimeMins
    });
  } else if (safetyMode === 'FAST') {
    reasons.push({
      code: 'FASTEST_PRIORITY',
      text: `Prioritized shortest travel duration (${Math.round(recommendedRoute.durationSeconds / 60)} mins) with acceptable risk threshold.`,
      value: Math.round(recommendedRoute.durationSeconds / 60)
    });
  }

  // Confidence & Caveat note
  if (recRisk.confidence < 0.5) {
    reasons.push({
      code: 'LOW_DATA_CAVEAT',
      text: 'Note: Safety estimation has moderate confidence due to sparse reported data in this corridor. Always remain alert.',
      value: recRisk.confidence
    });
  }

  return reasons;
}

/**
 * Generate structured reasons why an alternative route was NOT chosen as top recommendation
 */
function explainRejectedRoute(route, recommendedRoute) {
  const reasons = [];
  const routeRisk = route.riskAnalysis || {};
  const recRisk = recommendedRoute.riskAnalysis || {};
  const routeMetrics = routeRisk.metrics || {};
  const recMetrics = recRisk.metrics || {};

  // Risk difference
  const riskDelta = Math.round((route.overallRisk - recommendedRoute.overallRisk) * 10) / 10;
  if (riskDelta > 3) {
    reasons.push({
      code: 'HIGHER_OVERALL_RISK',
      text: `Higher estimated corridor risk (${route.overallRisk}/100 vs ${recommendedRoute.overallRisk}/100 for recommended route).`,
      value: riskDelta
    });
  }

  // Extra crimes
  const extraCrimes = (routeMetrics.crimeCount || 0) - (recMetrics.crimeCount || 0);
  if (extraCrimes > 0) {
    reasons.push({
      code: 'MORE_INCIDENTS',
      text: `Passes through ${extraCrimes} additional recorded crime incident(s).`,
      value: extraCrimes
    });
  }

  // High severity crimes
  const extraHighSev = (routeMetrics.highSeverityCrimeCount || 0) - (recMetrics.highSeverityCrimeCount || 0);
  if (extraHighSev > 0) {
    reasons.push({
      code: 'MORE_HIGH_SEVERITY',
      text: `Contains ${extraHighSev} more high-severity violent or assault incident(s).`,
      value: extraHighSev
    });
  }

  // Hotspots
  if ((routeMetrics.hotspotIntersections || 0) > 0 && (recMetrics.hotspotIntersections || 0) === 0) {
    reasons.push({
      code: 'INTERSECTS_HOTSPOT',
      text: `Intersects with ${routeMetrics.hotspotIntersections} active crime hotspot cluster(s).`,
      value: routeMetrics.hotspotIntersections
    });
  }

  // Duration difference
  const timeDeltaSec = route.durationSeconds - recommendedRoute.durationSeconds;
  const timeDeltaMins = Math.round(timeDeltaSec / 60);
  if (timeDeltaMins > 2) {
    reasons.push({
      code: 'LONGER_DURATION',
      text: `Adds ${timeDeltaMins} minutes to total journey time without safety benefit.`,
      value: timeDeltaMins
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: 'BALANCED_TRADEOFF',
      text: 'Viable secondary option with slightly different balance of transit time and exposure.',
      value: null
    });
  }

  return reasons;
}

module.exports = {
  explainRecommendedRoute,
  explainRejectedRoute
};
