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
import { LatLngPoint } from "@/lib/routeService";

// Fix Leaflet marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Custom markers for Origin & Destination
const createCustomIcon = (color: string, label: string) => {
  if (typeof window === "undefined") return undefined;
  return L.divIcon({
    className: "custom-route-marker",
    html: `
      <div style="
        background: ${color};
        color: white;
        font-weight: bold;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 12px;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      ">
        <span style="display:inline-block; width:6px; height:6px; background:white; border-radius:50%;"></span>
        ${label}
      </div>
    `,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
  });
};

function MapBoundsController({
  polylineCoords,
}: {
  polylineCoords: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (polylineCoords.length > 0) {
      const bounds = L.latLngBounds(polylineCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, polylineCoords]);
  return null;
}

export interface RouteMapViewProps {
  source?: LatLngPoint | null;
  destination?: LatLngPoint | null;
  geometry?: [number, number][]; // [[lng, lat], ...] from OSRM
  height?: string;
  className?: string;
  sourceLabel?: string;
  destinationLabel?: string;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  source,
  destination,
  geometry = [],
  height = "420px",
  className = "",
  sourceLabel = "Source",
  destinationLabel = "Destination",
}) => {
  // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
  const polylineCoords: [number, number][] = geometry.map(([lng, lat]) => [
    lat,
    lng,
  ]);

  const defaultCenter: [number, number] = source
    ? [source.lat, source.lng]
    : [28.6139, 77.209];

  const sourceIcon = createCustomIcon("#10b981", sourceLabel);
  const destIcon = createCustomIcon("#f43f5e", destinationLabel);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl z-0 ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
      >
        {/* CartoDB Dark Matter tiles for modern high-contrast aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Source Marker */}
        {source && (
          <Marker position={[source.lat, source.lng]} icon={sourceIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-emerald-600 font-bold">Start: </strong>
                <span>
                  {source.lat.toFixed(4)}, {source.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destIcon}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="text-rose-600 font-bold">Destination: </strong>
                <span>
                  {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {polylineCoords.length > 0 && (
          <>
            {/* Outer glow polyline */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: "#0284c7",
                weight: 8,
                opacity: 0.4,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Inner solid polyline */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: "#06b6d4",
                weight: 4,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <MapBoundsController polylineCoords={polylineCoords} />
          </>
        )}
      </MapContainer>
    </div>
  );
};
