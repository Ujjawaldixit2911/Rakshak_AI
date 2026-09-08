"use client";
import type { Hotspot } from "@/lib/api";

interface Props { hotspot: Hotspot; index: number; }

const RISK_ICONS: Record<string, string> = {
  Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🟢",
};

export default function HotspotCard({ hotspot, index }: Props) {
  const badgeClass = {
    Critical: "badge badge-critical",
    High: "badge badge-high",
    Medium: "badge badge-moderate",
    Low: "badge badge-safe",
  }[hotspot.risk_level] || "badge";

  return (
    <div className="card fade-in-up" style={{
      padding: "1rem 1.25rem",
      animationDelay: `${index * 0.07}s`,
      borderLeft: `3px solid ${hotspot.color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>{RISK_ICONS[hotspot.risk_level]}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{hotspot.location}</span>
        </div>
        <span className={badgeClass}>{hotspot.risk_level}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 10 }}>
        <Metric label="Crimes" value={hotspot.crime_count.toString()} />
        <Metric label="Intensity" value={`${Math.round(hotspot.intensity * 100)}%`} />
        <Metric label="Lat" value={hotspot.lat.toFixed(4)} />
        <Metric label="Lng" value={hotspot.lng.toFixed(4)} />
      </div>

      {/* Intensity bar */}
      <div className="progress-bar" style={{ marginBottom: 8 }}>
        <div className="progress-fill" style={{ width: `${hotspot.intensity * 100}%`, background: hotspot.color }} />
      </div>

      {hotspot.top_crime_types.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {hotspot.top_crime_types.map(t => (
            <span key={t} style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.07)", color: "var(--color-text-secondary)" }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: "0.88rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
