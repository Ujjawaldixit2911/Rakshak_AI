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
  geometry: [number, number][]; // [[lng, lat], ...]
  eta?: string;
  eta_formatted?: string;
}
