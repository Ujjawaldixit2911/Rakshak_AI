"use client";

import React, { useState } from "react";
import { Zap, ShieldCheck, Scale, Check, Clock, Navigation, AlertTriangle } from "lucide-react";
import { RouteCompareResponse, EvaluatedRouteOption } from "@/lib/routeCompareService";

export interface ThreeRouteSelectorProps {
  comparisonData: RouteCompareResponse;
  onSelectRoute?: (type: "fastest" | "safest" | "balanced", route: EvaluatedRouteOption) => void;
  className?: string;
}

export const ThreeRouteSelector: React.FC<ThreeRouteSelectorProps> = ({
  comparisonData,
  onSelectRoute,
  className = "",
}) => {
  const [selectedType, setSelectedType] = useState<"fastest" | "safest" | "balanced">("safest");

  const options: Array<{
    type: "fastest" | "safest" | "balanced";
    route: EvaluatedRouteOption;
    icon: any;
    themeColor: string;
    borderActive: string;
    bgBadge: string;
  }> = [
    {
      type: "fastest",
      route: comparisonData.fastest,
      icon: Zap,
      themeColor: "text-amber-400",
      borderActive: "border-amber-500 shadow-amber-950/40",
      bgBadge: "bg-amber-950/80 text-amber-300 border-amber-800",
    },
    {
      type: "safest",
      route: comparisonData.safest,
      icon: ShieldCheck,
      themeColor: "text-emerald-400",
      borderActive: "border-emerald-500 shadow-emerald-950/40",
      bgBadge: "bg-emerald-950/80 text-emerald-300 border-emerald-800",
    },
    {
      type: "balanced",
      route: comparisonData.balanced,
      icon: Scale,
      themeColor: "text-cyan-400",
      borderActive: "border-cyan-500 shadow-cyan-950/40",
      bgBadge: "bg-cyan-950/80 text-cyan-300 border-cyan-800",
    },
  ];

  const handleSelect = (type: "fastest" | "safest" | "balanced", route: EvaluatedRouteOption) => {
    setSelectedType(type);
    if (onSelectRoute) {
      onSelectRoute(type, route);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Select Optimized Navigation Route
        </h4>
        <span className="text-[10px] font-mono text-cyan-400">
          {comparisonData.evaluatedAlternativesCount} Alternatives Evaluated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map(({ type, route, icon: Icon, themeColor, borderActive, bgBadge }) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type, route)}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl ${
                isSelected
                  ? `bg-slate-900 ${borderActive} shadow-xl scale-[1.02] ring-1 ring-white/10`
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 p-1 rounded-full bg-cyan-500 text-slate-950">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Title Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 ${themeColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100">{route.label}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Travel Time
                  </span>
                  <span className="font-extrabold text-slate-100 font-mono">
                    {Math.round(route.duration)} min
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-500" />
                    Distance
                  </span>
                  <span className="font-medium text-slate-300 font-mono">
                    {route.distance} km
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-500" />
                    Safety Score
                  </span>
                  <span
                    className={`font-black font-mono ${
                      route.safetyScore >= 80
                        ? "text-emerald-400"
                        : route.safetyScore >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {route.safetyScore}/100
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                {route.description}
              </p>

              {/* High risk alert badge if applicable */}
              {route.highRiskSegments > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-rose-300 px-2 py-1 rounded bg-rose-950/40 border border-rose-900/40">
                  <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Crosses {route.highRiskSegments} high-risk zone{route.highRiskSegments > 1 ? "s" : ""}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
