"use client";

import React from "react";
import { Clock, Navigation, Compass, AlertCircle, RefreshCw } from "lucide-react";
import { RouteCalculateResponse } from "@/lib/routeService";
import { ETACalculateResponse } from "@/lib/etaService";

export interface RouteSummaryPanelProps {
  route: RouteCalculateResponse;
  etaData?: ETACalculateResponse | null;
  sourceAddress?: string;
  destinationAddress?: string;
  onRefresh?: () => void;
  className?: string;
}

export const RouteSummaryPanel: React.FC<RouteSummaryPanelProps> = ({
  route,
  etaData,
  sourceAddress,
  destinationAddress,
  onRefresh,
  className = "",
}) => {
  // Format travel time
  const travelTimeFormatted = etaData?.formatted_duration
    ? etaData.formatted_duration
    : `${Math.round(route.duration)} min`;

  // Format ETA
  const etaFormatted = etaData?.eta_formatted
    ? etaData.eta_formatted
    : route.eta_formatted || "Calculating...";

  return (
    <div
      className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-4 ${className}`}
    >
      {/* Header with Title & Refresh */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Route Summary</h4>
            <p className="text-[10px] text-slate-400">OSRM Engine + ETA Arithmetic</p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Recalculate Route"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Origin & Destination Labels */}
      {(sourceAddress || destinationAddress) && (
        <div className="space-y-2 text-xs">
          {sourceAddress && (
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span className="truncate">
                <strong className="text-slate-400 font-medium">From: </strong>
                {sourceAddress}
              </span>
            </div>
          )}
          {destinationAddress && (
            <div className="flex items-start gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0"></span>
              <span className="truncate">
                <strong className="text-slate-400 font-medium">To: </strong>
                {destinationAddress}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Distance Card */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-cyan-400" />
            Distance
          </span>
          <div className="mt-2">
            <span className="text-lg font-black text-slate-100">{route.distance}</span>
            <span className="text-xs text-slate-400 ml-1 font-medium">km</span>
          </div>
        </div>

        {/* Travel Time Card */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            Travel Time
          </span>
          <div className="mt-2">
            <span className="text-sm font-bold text-amber-300">{travelTimeFormatted}</span>
          </div>
        </div>

        {/* ETA Card */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Est. Arrival
          </span>
          <div className="mt-2">
            <span className="text-sm font-black text-cyan-300">{etaFormatted}</span>
            {etaData?.relative_eta && (
              <p className="text-[9px] text-slate-400 mt-0.5">{etaData.relative_eta}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
