export interface ETACalculateRequest {
  duration: number;
  departure_time?: string;
  timezone_offset_minutes?: number;
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
