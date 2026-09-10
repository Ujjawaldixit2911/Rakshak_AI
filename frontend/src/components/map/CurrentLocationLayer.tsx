"use client";

import React, { useEffect, useState, useRef } from "react";
import { Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, Crosshair, Radio, Compass } from "lucide-react";

export interface CurrentLocationLayerProps {
  visible?: boolean;
  onLocationUpdate?: (pos: { lat: number; lng: number; accuracy: number }) => void;
  enableHighAccuracy?: boolean;
}

// Live Radar Blip Icon with pulsating ripple animation
const createRadarIcon = () =>
  L.divIcon({
    className: "custom-radar-icon",
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.4);
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #6366f1;
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.8);
          z-index: 10;
        "></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

// Recenter sub-component utilizing useMap()
function RecenterButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.flyTo([lat, lng], 15, { duration: 1.2 })}
      className="mt-2 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
    >
      <Crosshair className="w-3.5 h-3.5" />
      <span>Center View on Me</span>
    </button>
  );
}

export const CurrentLocationLayer: React.FC<CurrentLocationLayerProps> = ({
  visible = true,
  onLocationUpdate,
  enableHighAccuracy = true,
}) => {
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
  } | null>(null);

  const [geoError, setGeoError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      const updated = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        heading: heading !== null ? Math.round(heading) : null,
        speed: speed !== null ? Math.round(speed * 3.6) : null, // convert m/s to km/h
        timestamp: pos.timestamp,
      };

      setPosition(updated);
      setGeoError(null);
      if (onLocationUpdate) {
        onLocationUpdate({ lat: latitude, lng: longitude, accuracy: updated.accuracy });
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn("[CurrentLocationLayer] Geolocation error:", err.message);
      setGeoError(err.message);
      // Fallback default center if browser geolocation is blocked/denied (Connaught Place Delhi)
      if (!position) {
        const fallback = {
          lat: 28.6315,
          lng: 77.2167,
          accuracy: 50,
          heading: null,
          speed: null,
          timestamp: Date.now(),
        };
        setPosition(fallback);
      }
    };

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 5000,
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enableHighAccuracy, onLocationUpdate]);

  if (!visible || !position) {
    return null;
  }

  return (
    <>
      {/* Accuracy Radius Circle */}
      {position.accuracy > 0 && (
        <Circle
          center={[position.lat, position.lng]}
          radius={position.accuracy}
          pathOptions={{
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: "3, 6",
          }}
        />
      )}

      {/* Live Pulsing Radar Marker */}
      <Marker position={[position.lat, position.lng]} icon={createRadarIcon()}>
        <Popup>
          <div className="p-2 min-w-[210px] text-slate-900">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 leading-tight">
                  Live Location
                </h4>
                <span className="text-[10px] font-semibold text-indigo-600">
                  GPS Active (±{position.accuracy}m)
                </span>
              </div>
            </div>

            {/* Coordinates & Status */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Latitude:</span>
                <strong className="font-mono text-slate-800">{position.lat.toFixed(5)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Longitude:</span>
                <strong className="font-mono text-slate-800">{position.lng.toFixed(5)}</strong>
              </div>
              {position.speed !== null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-mono text-slate-800">{position.speed} km/h</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                Updated: {new Date(position.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {/* Center view on click */}
            <RecenterButton lat={position.lat} lng={position.lng} />
          </div>
        </Popup>
      </Marker>
    </>
  );
};

export default CurrentLocationLayer;
