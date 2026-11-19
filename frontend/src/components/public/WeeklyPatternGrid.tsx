"use client";
import type { WeeklyPattern } from "@/lib/api";

interface Props { data: WeeklyPattern; }

const BG: Record<string, string> = {
  Critical: "rgba(239,68,68,0.15)",
  High:     "rgba(249,115,22,0.15)",
  Medium:   "rgba(245,158,11,0.15)",
  Low:      "rgba(34,197,94,0.12)",
};
const BORDER: Record<string, string> = {
  Critical: "rgba(239,68,68,0.35)",
  High:     "rgba(249,115,22,0.35)",
  Medium:   "rgba(245,158,11,0.35)",
  Low:      "rgba(34,197,94,0.25)",
};
const TEXT: Record<string, string> = {
  Critical: "#f87171", High: "#fb923c", Medium: "#fbbf24", Low: "#4ade80",
};
const ICON: Record<string, string> = {
  Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🟢",
};

export default function WeeklyPatternGrid({ data }: Props) {
  const maxConf = Math.max(...(data.weekly_pattern || []).map((d: any) => d.confidence));

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {(data.weekly_pattern || []).map((day: any) => (
          <div key={day.day} style={{
            padding: "14px 10px", borderRadius: 14, textAlign: "center",
            background: BG[day.risk_level],
            border: `1px solid ${BORDER[day.risk_level]}`,
            transition: "all 0.2s ease",
            cursor: "default",
          }}
          className="hover:-translate-y-1 hover:shadow-sm"
          >
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              {day.day.slice(0, 3)}
            </div>
            <div className="text-xl mb-1">{ICON[day.risk_level]}</div>
            <div className="text-xs font-black" style={{ color: TEXT[day.risk_level] }}>{day.risk_level}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{day.confidence}%</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between items-center text-xs">
        <span className="text-[11px] text-[var(--text-muted)]">Model: {data.model}</span>
        <span className="chip-confidence text-[11px] py-0.5 px-2.5">🧠 {data.confidence}% avg confidence</span>
      </div>
    </div>
  );
}
