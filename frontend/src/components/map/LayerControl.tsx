"use client";

import React, { useState } from "react";
import {
  Layers,
  MapPin,
  Flame,
  Building2,
  Navigation,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";

export interface LayerVisibilityState {
  routes: boolean;
  hotspots: boolean;
  pois: boolean;
  currentLocation: boolean;
}

export interface LayerControlProps {
  layers: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  onToggleAll?: (enable: boolean) => void;
  counts?: {
    routes?: number;
    hotspots?: number;
    pois?: number;
  };
  className?: string;
  defaultOpen?: boolean;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onToggleLayer,
  onToggleAll,
  counts,
  className = "",
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const layerItems: Array<{
    key: keyof LayerVisibilityState;
    label: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
    activeBg: string;
    badgeCount?: number;
  }> = [
    {
      key: "routes",
      label: "Safe Routes & Segments",
      description: "Risk-scored polyline corridors",
      icon: <Navigation className="w-4 h-4 text-emerald-400" />,
      colorClass: "text-emerald-400",
      activeBg: "bg-emerald-500/10 border-emerald-500/30",
      badgeCount: counts?.routes,
    },
    {
      key: "hotspots",
      label: "Crime Hotspots",
      description: "DBSCAN crime density zones",
      icon: <Flame className="w-4 h-4 text-rose-400" />,
      colorClass: "text-rose-400",
      activeBg: "bg-rose-500/10 border-rose-500/30",
      badgeCount: counts?.hotspots,
    },
    {
      key: "pois",
      label: "Emergency POIs",
      description: "Police stations & 24x7 hospitals",
      icon: <Building2 className="w-4 h-4 text-sky-400" />,
      colorClass: "text-sky-400",
      activeBg: "bg-sky-500/10 border-sky-500/30",
      badgeCount: counts?.pois,
    },
    {
      key: "currentLocation",
      label: "My Live Location",
      description: "Real-time GPS telemetry radar",
      icon: <MapPin className="w-4 h-4 text-indigo-400" />,
      colorClass: "text-indigo-400",
      activeBg: "bg-indigo-500/10 border-indigo-500/30",
    },
  ];

  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-2xl text-white transition-all duration-200 overflow-hidden ${className}`}
      style={{ minWidth: "260px", maxWidth: "340px" }}
    >
      {/* Control Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
              Map Layers
            </span>
            <span className="text-[10px] text-slate-400">
              {activeLayersCount} of 4 visible
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-700 text-slate-300">
            {activeLayersCount}/4
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-200 p-0.5 transition-colors"
            aria-label={isOpen ? "Collapse layers" : "Expand layers"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Layer Checkboxes */}
      {isOpen && (
        <div className="p-3 space-y-2.5">
          <div className="space-y-1.5">
            {layerItems.map((item) => {
              const isActive = layers[item.key];
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                    isActive
                      ? `${item.activeBg} border-slate-600`
                      : "bg-slate-800/30 border-slate-800/60 hover:bg-slate-800/60 opacity-60 hover:opacity-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => onToggleLayer(item.key)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-400 focus:ring-offset-slate-900 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-slate-200">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {typeof item.badgeCount === "number" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {item.badgeCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Quick Actions (Show All / Hide All) */}
          {onToggleAll && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => onToggleAll(true)}
                className="hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3 h-3" /> Show all
              </button>
              <button
                type="button"
                onClick={() => onToggleAll(false)}
                className="hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <EyeOff className="w-3 h-3" /> Hide all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayerControl;
