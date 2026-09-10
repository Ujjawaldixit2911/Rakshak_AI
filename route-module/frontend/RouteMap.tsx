"use client";

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LatLngPoint } from "./types";

if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function BoundsController({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, coords]);
  return null;
}

export interface RouteMapProps {
  source?: LatLngPoint | null;
  destination?: LatLngPoint | null;
  geometry?: [number, number][]; // [[lng, lat], ...]
  height?: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  source,
  destination,
  geometry = [],
  height = "400px",
}) => {
  const polylineCoords: [number, number][] = geometry.map(([lng, lat]) => [
    lat,
    lng,
  ]);

  const defaultCenter: [number, number] = source
    ? [source.lat, source.lng]
    : [28.6139, 77.209];

  return (
    <div style={{ width: "100%", height, borderRadius: "12px", overflow: "hidden" }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {source && (
          <Marker position={[source.lat, source.lng]}>
            <Popup>
              <strong>Start:</strong> {source.lat.toFixed(4)}, {source.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>
              <strong>Destination:</strong> {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </Popup>
          </Marker>
        )}

        {polylineCoords.length > 0 && (
          <>
            <Polyline
              positions={polylineCoords}
              pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.85 }}
            />
            <BoundsController coords={polylineCoords} />
          </>
        )}
      </MapContainer>
    </div>
  );
};
