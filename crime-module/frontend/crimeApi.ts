import { Crime, NearbyCrime, PaginatedCrimes, CreateCrimePayload, SeverityLevel } from "./types";

const CRIME_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function fetchCrimes(params: {
  crimeType?: string;
  severity?: SeverityLevel;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedCrimes> {
  const query = new URLSearchParams();
  if (params.crimeType) query.set("crimeType", params.crimeType);
  if (params.severity) query.set("severity", params.severity);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`${CRIME_API_BASE}/api/crimes?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PaginatedCrimes>;
}

export async function fetchNearbyCrimes(
  lat: number,
  lng: number,
  radiusKm: number = 5.0,
  severity?: SeverityLevel
): Promise<NearbyCrime[]> {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radiusKm: radiusKm.toString(),
  });
  if (severity) query.set("severity", severity);

  const res = await fetch(`${CRIME_API_BASE}/api/crimes/nearby?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<NearbyCrime[]>;
}

export async function createCrime(payload: CreateCrimePayload): Promise<Crime> {
  const res = await fetch(`${CRIME_API_BASE}/api/crimes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Crime>;
}
