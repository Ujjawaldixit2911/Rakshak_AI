const {
  saturateScore,
  computeRecencyWeight,
  getRiskLevel,
  evaluateRouteRisk,
  evaluateSegmentRisk
} = require('../src/services/riskEngine');

describe('Risk Engine Unit Tests (Pure & Deterministic)', () => {
  describe('saturateScore', () => {
    test('returns 0 for negative or zero values', () => {
      expect(saturateScore(0, 10)).toBe(0);
      expect(saturateScore(-5, 10)).toBe(0);
    });

    test('returns approximately 50 at midpoint', () => {
      const score = saturateScore(10, 10);
      expect(score).toBeGreaterThanOrEqual(49);
      expect(score).toBeLessThanOrEqual(51);
    });

    test('is strictly bounded between 0 and 100', () => {
      expect(saturateScore(10000, 10)).toBeLessThanOrEqual(100);
    });
  });

  describe('computeRecencyWeight', () => {
    test('returns ~1.0 for incident today', () => {
      const now = new Date();
      const weight = computeRecencyWeight(now, now, 90);
      expect(weight).toBeCloseTo(1.0, 2);
    });

    test('returns ~0.5 for incident at half life (90 days ago)', () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const weight = computeRecencyWeight(ninetyDaysAgo, now, 90);
      expect(weight).toBeCloseTo(0.5, 2);
    });
  });

  describe('getRiskLevel', () => {
    test('returns INSUFFICIENT_DATA when confidence is below minimum threshold', () => {
      expect(getRiskLevel(20, 0.1)).toBe('INSUFFICIENT_DATA');
    });

    test('maps risk scores to qualitative labels properly', () => {
      expect(getRiskLevel(15, 0.9)).toBe('LOW');
      expect(getRiskLevel(40, 0.9)).toBe('MEDIUM');
      expect(getRiskLevel(65, 0.9)).toBe('HIGH');
      expect(getRiskLevel(90, 0.9)).toBe('CRITICAL');
    });
  });

  describe('evaluateRouteRisk', () => {
    test('handles empty crime dataset gracefully without false low risk claims', () => {
      const result = evaluateRouteRisk({
        crimes: [],
        distanceMeters: 5000,
        hotspotIntersections: 0,
        mlRiskScore: null
      });

      expect(result.overallRisk).toBe(0);
      expect(result.safetyScore).toBe(100);
      expect(result.confidence).toBeLessThan(0.4);
      expect(result.dataQualityNotes.length).toBeGreaterThan(0);
    });

    test('renormalizes weights seamlessly when ML service is unavailable', () => {
      const sampleCrimes = [
        { severity: 'HIGH', date: new Date(), verificationStatus: 'VERIFIED' },
        { severity: 'MEDIUM', date: new Date(), verificationStatus: 'VERIFIED' }
      ];

      const resultWithoutMl = evaluateRouteRisk({
        crimes: sampleCrimes,
        distanceMeters: 2000,
        hotspotIntersections: 0,
        mlRiskScore: null
      });

      const weightSum = Object.values(resultWithoutMl.weightsApplied).reduce((a, b) => a + b, 0);
      expect(weightSum).toBeCloseTo(1.0, 4);
      expect(resultWithoutMl.weightsApplied.ml).toBe(0);
    });

    test('higher severity crimes produce strictly higher risk score', () => {
      const lowSeverityCrimes = [
        { severity: 'LOW', date: new Date(), verificationStatus: 'VERIFIED' },
        { severity: 'LOW', date: new Date(), verificationStatus: 'VERIFIED' }
      ];
      const highSeverityCrimes = [
        { severity: 'CRITICAL', date: new Date(), verificationStatus: 'VERIFIED' },
        { severity: 'CRITICAL', date: new Date(), verificationStatus: 'VERIFIED' }
      ];

      const resLow = evaluateRouteRisk({ crimes: lowSeverityCrimes, distanceMeters: 2000 });
      const resHigh = evaluateRouteRisk({ crimes: highSeverityCrimes, distanceMeters: 2000 });

      expect(resHigh.overallRisk).toBeGreaterThan(resLow.overallRisk);
    });
  });
});
