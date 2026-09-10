import { LatLngPoint, RouteCalculateResponse } from "./types";

const ROUTE_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function fetchCalculatedRoute(
  source: LatLngPoint,
  destination: LatLngPoint
): Promise<RouteCalculateResponse> {
  const res = await fetch(`${ROUTE_API_BASE}/api/route/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ source, destination }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "route_not_found" || res.status === 404) {
      throw new Error("route_not_found");
    }
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<RouteCalculateResponse>;
}
