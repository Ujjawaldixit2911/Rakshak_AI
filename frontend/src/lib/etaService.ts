/**
 * etaService.ts
 * Independent ETA Module Client for Rakshak AI.
 *
 * Exclusively communicates via the ETA backend endpoint:
 * - POST /api/eta/calculate
 *
 * Features:
 * - Zero direct dependencies on Route, Location, Safety, Crime, or User modules.
 * - Computes arrival time, formatted durations, and timezone offsets.
 */

export interface ETACalculateRequest {
  duration: number; // in minutes
  departure_time?: string; // ISO string
  timezone_offset_minutes?: number; // e.g. 330 for IST
  format_24h?: boolean;
}

export interface ETACalculateResponse {
  duration_minutes: number;
  formatted_duration: string;
  departure_time: string;
  eta_iso: string;
  eta_formatted: string;
  relative_eta: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

/**
 * Computes ETA and formatted duration from travel minutes.
 * Calls POST /api/eta/calculate
 */
export async function calculateETA(
  duration: number,
  options: {
    departureTime?: Date | string;
    timezoneOffsetMinutes?: number;
    format24h?: boolean;
  } = {}
): Promise<ETACalculateResponse> {
  let depTimeIso: string | undefined;
  if (options.departureTime instanceof Date) {
    depTimeIso = options.departureTime.toISOString();
  } else if (typeof options.departureTime === "string") {
    depTimeIso = options.departureTime;
  }

  const tzOffset =
    options.timezoneOffsetMinutes !== undefined
      ? options.timezoneOffsetMinutes
      : -new Date().getTimezoneOffset(); // in minutes (e.g. +330 for IST)

  const payload: ETACalculateRequest = {
    duration,
    departure_time: depTimeIso,
    timezone_offset_minutes: tzOffset,
    format_24h: options.format24h ?? false,
  };

  const response = await fetch(`${API_BASE}/api/eta/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.detail || `ETA calculation failed with status ${response.status}`
    );
  }

  return response.json() as Promise<ETACalculateResponse>;
}
