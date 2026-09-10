import { GeocodeResponse, ReverseGeocodeResponse } from "./types";

const LOCATION_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function geocode(query: string): Promise<GeocodeResponse> {
  const res = await fetch(`${LOCATION_API_BASE}/api/location/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<GeocodeResponse>;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  const res = await fetch(`${LOCATION_API_BASE}/api/location/reverse-geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ReverseGeocodeResponse>;
}
