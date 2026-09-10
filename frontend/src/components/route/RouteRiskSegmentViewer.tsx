"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Flame } from "lucide-react";
import { AnalyzeRouteRiskResponse, RiskLevel } from "@/lib/routeRiskService";

export interface RouteRiskSegmentViewerProps {
  riskData: AnalyzeRouteRiskResponse;
  className?: string;
}

const riskBadges: Record<RiskLevel, { label: string; bg: string; text: string; border: string; icon: any }> = {
  LOW: {
    label: "Safe Zone",
    bg: "bg-emerald-950/60",
    text: "text-emerald-400",
    border: "border-emerald-700/50",
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: "Moderate Alert",
    bg: "bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-700/50",
    icon: AlertTriangle,
  },
  HIGH: {
    label: "High Caution",
    bg: "bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-700/50",
    icon: ShieldAlert,
  },
  CRITICAL: {
    label: "Critical Danger",
    bg: "bg-red-950/80",
    text: "text-red-300",
    border: "border-red-600/80",
    icon: Flame,
  },
};

export const RouteRiskSegmentViewer: React.FC<RouteRiskSegmentViewerProps> = ({
  riskData,
  className = "",
}) => {
  const overallBadge = riskBadges[riskData.overallRisk] || riskBadges.LOW;
  const OverallIcon = overallBadge.icon;

  return (
    <div
      className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl space-y-4 ${className}`}
    >
      {/* Header Summary */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${overallBadge.bg} ${overallBadge.border} ${overallBadge.text}`}>
            <OverallIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Route Risk Assessment</h4>
            <p className="text-[10px] text-slate-400">
              Orchestrated via Hotspot Module API across {riskData.totalSegments} Segments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {riskData.highRiskSegmentCount > 0 ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60 animate-pulse">
              ⚠️ {riskData.highRiskSegmentCount} High-Risk Segment{riskData.highRiskSegmentCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              ✓ Clear Route
            </span>
          )}
        </div>
      </div>

      {/* Segment Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Route Trajectory Segments</span>
          <span>Overall: <strong className={overallBadge.text}>{riskData.overallRisk}</strong></span>
        </div>
        <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-950 border border-slate-800 p-0.5 gap-0.5">
          {riskData.segments.map((seg) => {
            const colors: Record<RiskLevel, string> = {
              LOW: "bg-emerald-500",
              MEDIUM: "bg-amber-500",
              HIGH: "bg-rose-500",
              CRITICAL: "bg-red-600",
            };
            return (
              <div
                key={seg.segmentIndex}
                className={`h-full rounded-sm flex-1 transition-all ${colors[seg.riskLevel]}`}
                title={`Segment #${seg.segmentIndex + 1}: ${seg.riskLevel} (${seg.crimeCount} crimes)`}
              />
            );
          })}
        </div>
      </div>

      {/* Segment List Breakdown */}
      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {riskData.segments.map((seg) => {
          const badge = riskBadges[seg.riskLevel] || riskBadges.LOW;
          const Icon = badge.icon;
          return (
            <div
              key={seg.segmentIndex}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${badge.bg} ${badge.border}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${badge.text}`} />
                <span className="font-semibold text-slate-200">
                  Segment {seg.segmentIndex + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({seg.midPoint[1].toFixed(4)}°, {seg.midPoint[0].toFixed(4)}°)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${badge.text}`}>
                  {seg.riskLevel}
                </span>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950/60">
                  {seg.crimeCount} incidents
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
