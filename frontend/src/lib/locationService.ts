/**
 * locationService.ts
 * Independent Location Module Client for Rakshak AI.
 *
 * Exclusively uses the two backend proxy endpoints:
 * - POST /api/location/geocode
 * - POST /api/location/reverse-geocode
 *
 * Features:
 * - Zero direct dependencies on Route, Safety, Crime, or User modules.
 * - Client-side memoization for instant responses on repetitive queries.
 * - Robust error handling with user-friendly messages.
 */

export interface GeocodeRequest {
  query: string;
}

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResult {
  address: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

// Client-side quick caches to avoid duplicate network calls
const clientGeocodeCache = new Map<string, GeocodeResult>();
const clientReverseCache = new Map<string, ReverseGeocodeResult>();

/**
 * Forward Geocoding: Converts an address or place name to GPS coordinates.
 * Calls POST /api/location/geocode
 */
export async function geocodeLocation(query: string): Promise<GeocodeResult> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Location search query cannot be empty.");
  }

  if (clientGeocodeCache.has(normalized)) {
    return clientGeocodeCache.get(normalized)!;
  }

  const response = await fetch(`${API_BASE}/api/location/geocode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: query.trim() }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody.detail || `Geocoding request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data: GeocodeResult = await response.json();
  clientGeocodeCache.set(normalized, data);
  return data;
}

/**
 * Reverse Geocoding: Converts GPS coordinates to a human-readable street/city address.
 * Calls POST /api/location/reverse-geocode
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    throw new Error("Invalid latitude or longitude coordinates provided.");
  }

  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  if (clientReverseCache.has(cacheKey)) {
    return clientReverseCache.get(cacheKey)!;
  }

  const response = await fetch(`${API_BASE}/api/location/reverse-geocode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ latitude, longitude }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody.detail ||
      `Reverse geocoding request failed with status ${response.status}`;
    throw new Error(message);
  }

  const data: ReverseGeocodeResult = await response.json();
  clientReverseCache.set(cacheKey, data);
  return data;
}
