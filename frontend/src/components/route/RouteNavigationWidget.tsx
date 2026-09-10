"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Navigation, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { LocationSearchAutocomplete } from "@/components/location/LocationSearchAutocomplete";
import { CurrentLocationButton } from "@/components/location/CurrentLocationButton";
import { RouteSummaryPanel } from "./RouteSummaryPanel";
import { useRouteCalculator } from "@/hooks/useRouteCalculator";
import { GeocodeResult } from "@/lib/locationService";
import { LatLngPoint } from "@/lib/routeService";

// Dynamic import for Leaflet Map to avoid SSR window issues
const RouteMapView = dynamic(
  () => import("./RouteMapView").then((mod) => mod.RouteMapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-500 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
        Loading Leaflet Map Engine...
      </div>
    ),
  }
);

export const RouteNavigationWidget: React.FC = () => {
  const [sourcePoint, setSourcePoint] = useState<LatLngPoint | null>({
    lat: 28.6692,
    lng: 77.4538,
  });
  const [sourceAddress, setSourceAddress] = useState<string>("Ghaziabad, Uttar Pradesh");

  const [destPoint, setDestPoint] = useState<LatLngPoint | null>({
    lat: 28.6139,
    lng: 77.209,
  });
  const [destAddress, setDestAddress] = useState<string>("Connaught Place, New Delhi");

  const { route, etaData, loading, error, fetchRoute, recalculateETA } =
    useRouteCalculator();

  const handleCalculate = async () => {
    if (sourcePoint && destPoint) {
      await fetchRoute(sourcePoint, destPoint);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Route Inputs Card */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Rakshak Route & ETA Navigator
            </h3>
            <p className="text-xs text-slate-400">
              Fully decoupled Location, OSRM Routing, and ETA Arithmetic modules
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Origin Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Origin Location (Location Module)
            </label>
            <LocationSearchAutocomplete
              placeholder="Search origin address..."
              onLocationSelect={(loc: GeocodeResult) => {
                setSourcePoint({ lat: loc.latitude, lng: loc.longitude });
                setSourceAddress(loc.address);
              }}
            />
            <CurrentLocationButton
              variant="compact"
              onLocationFound={(coords, addr) => {
                setSourcePoint({ lat: coords.latitude, lng: coords.longitude });
                setSourceAddress(addr || `GPS (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
              }}
            />
          </div>

          {/* Destination Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Destination Location (Location Module)
            </label>
            <LocationSearchAutocomplete
              placeholder="Search destination address..."
              onLocationSelect={(loc: GeocodeResult) => {
                setDestPoint({ lat: loc.latitude, lng: loc.longitude });
                setDestAddress(loc.address);
              }}
            />
          </div>
        </div>

        {/* Calculate Route CTA */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={!sourcePoint || !destPoint || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide uppercase transition-all shadow-lg shadow-cyan-950/60 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Computing OSRM Route...</span>
              </>
            ) : (
              <>
                <span>Calculate Safe Route</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Route Map & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RouteMapView
            source={sourcePoint}
            destination={destPoint}
            geometry={route?.geometry || []}
            sourceLabel={sourceAddress ? sourceAddress.slice(0, 15) : "Origin"}
            destinationLabel={destAddress ? destAddress.slice(0, 15) : "Dest"}
            height="440px"
          />
        </div>

        <div>
          {route ? (
            <RouteSummaryPanel
              route={route}
              etaData={etaData}
              sourceAddress={sourceAddress}
              destinationAddress={destAddress}
              onRefresh={() => recalculateETA()}
            />
          ) : (
            <div className="h-[440px] p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
              <Navigation className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-xs font-mono">
                Select source & destination above and click &quot;Calculate Safe Route&quot; to preview distance, travel time, and live ETA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
