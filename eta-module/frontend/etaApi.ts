import { ETACalculateRequest, ETACalculateResponse } from "./types";

const ETA_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export async function fetchCalculatedETA(
  durationMinutes: number,
  options: {
    departureTime?: string;
    timezoneOffsetMinutes?: number;
    format24h?: boolean;
  } = {}
): Promise<ETACalculateResponse> {
  const payload: ETACalculateRequest = {
    duration: durationMinutes,
    departure_time: options.departureTime,
    timezone_offset_minutes:
      options.timezoneOffsetMinutes ?? -new Date().getTimezoneOffset(),
    format_24h: options.format24h ?? false,
  };

  const res = await fetch(`${ETA_API_BASE}/api/eta/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `HTTP ${res.status}`);
  }

  return res.json() as Promise<ETACalculateResponse>;
}
