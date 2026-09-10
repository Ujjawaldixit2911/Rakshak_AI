/**
 * routeService.ts
 * Independent Route Module Client for Rakshak AI.
 *
 * Exclusively communicates via the route backend endpoint:
 * - POST /api/route/calculate
 *
 * Features:
 * - Zero direct imports from Location, Safety, Crime, or User modules.
 * - Decoded GeoJSON geometry for direct Leaflet Polyline rendering.
 * - Distance in km, travel duration in minutes.
 */

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RouteCalculateRequest {
  source: LatLngPoint;
  destination: LatLngPoint;
}

export interface RouteCalculateResponse {
  distance: number;       // in kilometers
  duration: number;       // in minutes
  geometry: [number, number][]; // [[lng, lat], [lng, lat], ...]
  eta?: string;
  eta_formatted?: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

/**
 * Calculates driving route between source and destination coordinates.
 * Calls POST /api/route/calculate
 */
export async function calculateRoute(
  source: LatLngPoint,
  destination: LatLngPoint
): Promise<RouteCalculateResponse> {
  const response = await fetch(`${API_BASE}/api/route/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ source, destination }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (errorBody.error === "route_not_found" || response.status === 404) {
      throw new Error("route_not_found");
    }
    throw new Error(
      errorBody.detail || `Route calculation failed with status ${response.status}`
    );
  }

  return response.json() as Promise<RouteCalculateResponse>;
}
