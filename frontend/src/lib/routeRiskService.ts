/**
 * routeRiskService.ts
 * Independent Route Risk Analysis Module Client for Rakshak AI.
 *
 * Exclusively calls POST /api/risk/analyze-route
 * Orchestrates segment-level risk analysis by combining polyline geometry
 * and concurrent hotspot queries.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RouteSegmentRisk {
  segmentIndex: number;
  riskLevel: RiskLevel;
  crimeCount: number;
  startPoint: [number, number]; // [lng, lat]
  endPoint: [number, number];   // [lng, lat]
  midPoint: [number, number];   // [lng, lat]
}

export interface AnalyzeRouteRiskResponse {
  segments: RouteSegmentRisk[];
  highRiskSegmentCount: number;
  totalSegments: number;
  overallRisk: RiskLevel;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function analyzeRouteRisk(
  geometry: [number, number][],
  segmentLengthKm?: number
): Promise<AnalyzeRouteRiskResponse> {
  const payload: { geometry: [number, number][]; segmentLengthKm?: number } = {
    geometry,
  };
  if (segmentLengthKm !== undefined) {
    payload.segmentLengthKm = segmentLengthKm;
  }

  const res = await fetch(`${API_BASE}/api/risk/analyze-route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody.detail || `Route risk analysis failed with status ${res.status}`
    );
  }

  return res.json() as Promise<AnalyzeRouteRiskResponse>;
}
