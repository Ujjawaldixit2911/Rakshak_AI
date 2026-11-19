"use client";
import type { Recommendation } from "@/lib/api";

interface Props { recommendations: Recommendation[]; }

const PRIORITY_BADGE: Record<string, string> = {
  High:   "badge badge-critical",
  Medium: "badge badge-moderate",
  Low:    "badge badge-safe",
};

export default function SafetyRecommendations({ recommendations }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className="flex items-start gap-3.5 p-3 sm:p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all shadow-sm"
        >
          <span className="text-xl shrink-0 leading-tight">{rec.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-[13px] text-[var(--text-primary)] font-medium leading-relaxed">{rec.tip}</p>
          </div>
          <span className={`${PRIORITY_BADGE[rec.priority] || "badge"} shrink-0 text-[10px]`}>{rec.priority}</span>
        </div>
      ))}
    </div>
  );
}
