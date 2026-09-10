"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Sparkles, Moon, Building2 } from "lucide-react";

export interface FactorBreakdownItem {
  factor: string;
  impact: number;
  description?: string;
}

interface ScoreBreakdownProps {
  breakdown: FactorBreakdownItem[];
  score?: number;
  title?: string;
  className?: string;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  breakdown,
  score,
  title = "Safety Score Explainability",
  className = "",
}) => {
  if (!breakdown || breakdown.length === 0) {
    return null;
  }

  // Find max absolute impact for proportional bar scaling
  const maxImpact = Math.max(...breakdown.map((item) => Math.abs(item.impact)), 15);

  const getFactorIcon = (factor: string, impact: number) => {
    const fLower = factor.toLowerCase();
    if (fLower.includes("night") || fLower.includes("dark")) {
      return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
    }
    if (fLower.includes("police") || fLower.includes("emergency") || fLower.includes("poi")) {
      return <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (fLower.includes("women")) {
      return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
    if (impact < 0) {
      return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
    }
    return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div
      className={`rounded-xl bg-slate-900/80 border border-slate-800/80 p-4 shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {title}
            </h4>
            <p className="text-[11px] text-slate-400">
              Factor breakdown & weight contributions
            </p>
          </div>
        </div>
        {score !== undefined && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700">
            <span className="text-[11px] text-slate-400">Total Score:</span>
            <span
              className={`text-xs font-bold ${
                score >= 80
                  ? "text-emerald-400"
                  : score >= 50
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {score}/100
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {breakdown.map((item, idx) => {
          const isPositive = item.impact > 0;
          const isNeutral = item.impact === 0;
          const barWidthPercent = Math.min(
            100,
            Math.max(8, (Math.abs(item.impact) / maxImpact) * 100)
          );

          return (
            <div
              key={`${item.factor}-${idx}`}
              className="group flex flex-col gap-1 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-300">
                  {getFactorIcon(item.factor, item.impact)}
                  <span className="truncate max-w-[210px] sm:max-w-[280px]">
                    {item.factor}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                      isPositive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : isNeutral
                        ? "bg-slate-700/50 text-slate-400 border border-slate-600"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {isPositive ? `+${item.impact}` : item.impact}
                  </span>
                </div>
              </div>

              {/* Proportional visual impact bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                {isPositive ? (
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidthPercent}%` }}
                  />
                ) : isNeutral ? (
                  <div
                    className="bg-slate-600 h-full rounded-full transition-all"
                    style={{ width: `10%` }}
                  />
                ) : (
                  <div
                    className="bg-gradient-to-r from-rose-500 to-orange-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidthPercent}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBreakdown;
