"use client";
import type { Hotspot } from "@/lib/api";

interface Props { hotspot: Hotspot; index: number; }

const RISK_ICONS: Record<string, string> = {
  Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🟢",
};

export default function HotspotCard({ hotspot, index }: Props) {
  const riskLevel = hotspot?.risk_level || "Medium";
  const badgeClass = {
    Critical: "badge badge-critical",
    High: "badge badge-high",
    Medium: "badge badge-moderate",
    Low: "badge badge-safe",
  }[riskLevel] || "badge";

  const color = hotspot?.color || (riskLevel === "Critical" || riskLevel === "High" ? "#ef4444" : riskLevel === "Low" ? "#22c55e" : "#f59e0b");
  const crimeCount = (hotspot as any)?.crime_count ?? (hotspot as any)?.crimes_count ?? (hotspot as any)?.count ?? 0;
  const intensity = typeof hotspot?.intensity === "number" ? hotspot.intensity : 0.5;
  const latStr = typeof hotspot?.lat === "number" ? hotspot.lat.toFixed(4) : "—";
  const lngStr = typeof hotspot?.lng === "number" ? hotspot.lng.toFixed(4) : "—";
  const topCrimeTypes = Array.isArray(hotspot?.top_crime_types) ? hotspot.top_crime_types : [];

  return (
    <div className="card fade-in-up" style={{
      padding: "1rem 1.25rem",
      animationDelay: `${index * 0.07}s`,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>{RISK_ICONS[riskLevel] || "📍"}</span>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{hotspot?.location || "Hotspot"}</span>
        </div>
        <span className={badgeClass}>{riskLevel}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginBottom: 10 }}>
        <Metric label="Crimes" value={crimeCount.toString()} />
        <Metric label="Intensity" value={`${Math.round(intensity * 100)}%`} />
        <Metric label="Lat" value={latStr} />
        <Metric label="Lng" value={lngStr} />
      </div>

      {/* Intensity bar */}
      <div className="progress-bar" style={{ marginBottom: 8 }}>
        <div className="progress-fill" style={{ width: `${intensity * 100}%`, background: color }} />
      </div>

      {topCrimeTypes.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {topCrimeTypes.map(t => (
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
