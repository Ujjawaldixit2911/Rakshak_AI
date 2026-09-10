export interface GeocodeRequest {
  query: string;
}

export interface GeocodeResponse {
  address: string;
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodeResponse {
  address: string;
}
