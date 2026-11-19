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
    <div
      className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm hover:shadow-md transition-all"
      style={{
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{RISK_ICONS[riskLevel] || "📍"}</span>
          <span className="font-extrabold text-[13px] text-[var(--text-primary)]">{hotspot?.location || "Hotspot"}</span>
        </div>
        <span className={`${badgeClass} text-[10px]`}>{riskLevel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <Metric label="Crimes" value={crimeCount.toString()} />
        <Metric label="Intensity" value={`${Math.round(intensity * 100)}%`} />
        <Metric label="Lat" value={latStr} />
        <Metric label="Lng" value={lngStr} />
      </div>

      {/* Intensity bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden mb-2.5">
        <div className="h-full rounded-full transition-all" style={{ width: `${intensity * 100}%`, background: color }} />
      </div>

      {topCrimeTypes.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {topCrimeTypes.map((t: string) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
              {t}
            </span>
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
