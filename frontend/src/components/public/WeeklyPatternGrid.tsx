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
  const maxConf = Math.max(...data.weekly_pattern.map(d => d.confidence));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {data.weekly_pattern.map((day) => (
          <div key={day.day} style={{
            padding: "12px 8px", borderRadius: 10, textAlign: "center",
            background: BG[day.risk_level],
            border: `1px solid ${BORDER[day.risk_level]}`,
            transition: "transform 0.15s",
            cursor: "default",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {day.day.slice(0, 3)}
            </div>
            <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{ICON[day.risk_level]}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: TEXT[day.risk_level] }}>{day.risk_level}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 4 }}>{day.confidence}%</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Model: {data.model}</span>
        <span className="chip-confidence">🧠 {data.confidence}% avg confidence</span>
      </div>
    </div>
  );
}
