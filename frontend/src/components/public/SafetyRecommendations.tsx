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
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {recommendations.map((rec, i) => (
        <div key={i} className="fade-in-up" style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          padding: "12px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          animationDelay: `${i * 0.06}s`,
          transition: "background 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
        >
          <span style={{ fontSize: "1.5rem", flexShrink: 0, lineHeight: 1.2 }}>{rec.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.88rem", color: "var(--color-text-primary)", lineHeight: 1.5 }}>{rec.tip}</p>
          </div>
          <span className={PRIORITY_BADGE[rec.priority] || "badge"}>{rec.priority}</span>
        </div>
      ))}
    </div>
  );
}
