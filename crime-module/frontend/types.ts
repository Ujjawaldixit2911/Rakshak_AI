export type SeverityLevel = "low" | "medium" | "high";

export interface Crime {
  id: number;
  crimeType: string;
  latitude: number;
  longitude: number;
  date: string;
  time?: string;
  severity: SeverityLevel;
  location: string;
  source: string;
}

export interface NearbyCrime extends Crime {
  distanceKm: number;
}

export interface PaginatedCrimes {
  total: number;
  page: number;
  results: Crime[];
}

export interface CreateCrimePayload {
  crimeType: string;
  latitude: number;
  longitude: number;
  date?: string;
  time?: string;
  severity: SeverityLevel;
  location: string;
  source?: string;
}
