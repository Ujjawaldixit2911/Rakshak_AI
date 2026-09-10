"use client";

import React from "react";
import { Navigation, Loader2, AlertTriangle, Crosshair, Check } from "lucide-react";
import { useGeolocation, GeolocationCoordinatesData } from "@/hooks/useGeolocation";

export interface CurrentLocationButtonProps {
  onLocationFound?: (coords: GeolocationCoordinatesData, address?: string | null) => void;
  variant?: "primary" | "compact" | "badge";
  showAddress?: boolean;
  className?: string;
}

export const CurrentLocationButton: React.FC<CurrentLocationButtonProps> = ({
  onLocationFound,
  variant = "primary",
  showAddress = false,
  className = "",
}) => {
  const {
    coordinates,
    address,
    loading,
    reverseGeocoding,
    error,
    permissionStatus,
    getCurrentPosition,
  } = useGeolocation({ enableHighAccuracy: true });

  const handleClick = async () => {
    const coords = await getCurrentPosition({ autoReverseGeocode: true });
    if (coords && onLocationFound) {
      onLocationFound(coords, address);
    }
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title="Locate Current Position"
        className={`p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        ) : (
          <Crosshair className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="group relative flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 hover:border-cyan-400/80 text-cyan-300 hover:text-cyan-100 font-medium text-xs tracking-wide transition-all duration-200 shadow-lg shadow-cyan-950/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        {/* Radar pulsing ring when loading */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-xl bg-cyan-400 opacity-20"></span>
          </span>
        )}

        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
        ) : coordinates ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Navigation className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-200" />
        )}

        <span>
          {loading
            ? "Acquiring GPS Fix..."
            : coordinates
            ? "Location Acquired (Click to re-fetch)"
            : "Use My Current Location"}
        </span>

        {coordinates && (
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            ±{Math.round(coordinates.accuracy)}m
          </span>
        )}
      </button>

      {/* Reverse-geocoded address display */}
      {showAddress && (coordinates || reverseGeocoding) && (
        <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 font-mono flex items-center gap-2">
          {reverseGeocoding ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              <span className="text-slate-400">Resolving street address...</span>
            </>
          ) : address ? (
            <span className="truncate text-slate-200" title={address}>
              📍 {address}
            </span>
          ) : (
            <span className="text-slate-400">
              GPS: {coordinates?.latitude.toFixed(4)}°, {coordinates?.longitude.toFixed(4)}°
            </span>
          )}
        </div>
      )}

      {/* Permission & Geolocation Errors */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {permissionStatus === "denied" && (
        <p className="text-[10px] text-amber-400/80 px-1">
          GPS permissions are blocked. Please allow location in browser site settings.
        </p>
      )}
    </div>
  );
};
