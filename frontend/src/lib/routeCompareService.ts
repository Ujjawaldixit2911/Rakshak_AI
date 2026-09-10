/**
 * routeCompareService.ts
 * Three-Route Comparison Engine Client for Rakshak AI.
 *
 * Calls POST /api/routes/compare to retrieve:
 * - Fastest Route (minimum duration)
 * - Safest Route (maximum safety score)
 * - Balanced Route (minimized multi-objective cost)
 */

export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export interface EvaluatedRouteOption {
  distance: number;
  duration: number;
  safetyScore: number;
  highRiskSegments: number;
  geometry: [number, number][]; // [[lng, lat], ...]
  label: string;
  description: string;
}

export interface RouteCompareResponse {
  fastest: EvaluatedRouteOption;
  safest: EvaluatedRouteOption;
  balanced: EvaluatedRouteOption;
  evaluatedAlternativesCount: number;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function compareThreeRoutes(
  source: CoordinatePoint,
  destination: CoordinatePoint
): Promise<RouteCompareResponse> {
  const res = await fetch(`${API_BASE}/api/routes/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ source, destination }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Route comparison failed with HTTP ${res.status}`);
  }

  return res.json() as Promise<RouteCompareResponse>;
}
