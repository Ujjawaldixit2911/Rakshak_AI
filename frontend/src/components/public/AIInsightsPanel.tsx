"use client";
import type { SpikePrediction, AnomalyResult, TemporalPattern } from "@/lib/api";

interface Props {
  spike: SpikePrediction;
  anomalies: AnomalyResult;
  patterns: TemporalPattern[];
}

export default function AIInsightsPanel({ spike, anomalies, patterns }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* AI badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="badge badge-ai">🧠 AI-Generated</span>
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>All predictions are AI-generated estimates</span>
      </div>

      {/* Spike Prediction */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>{spike.spike_predicted ? "📈" : "📊"}</span>
            <span className="font-extrabold text-[14px] text-[var(--text-primary)]">Crime Spike Prediction</span>
          </div>
          <span className="chip-confidence">🎯 {spike.confidence}%</span>
        </div>
        <p style={{ fontSize: "0.88rem", color: spike.spike_predicted ? "#ef4444" : "#10b981", fontWeight: 700, marginBottom: 4 }}>
          {spike.message}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">{spike.detail}</p>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <MetricPill label="This week" value={spike.recent_7_days} />
          <MetricPill label="Last week" value={spike.prior_7_days} />
          <MetricPill label="Trend ratio" value={spike.trend_ratio} />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-2">Model: {spike.model}</div>
      </div>

      {/* Anomalies */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>🔍</span>
            <span className="font-extrabold text-[14px] text-[var(--text-primary)]">Anomaly Detection</span>
          </div>
          <span className="chip-confidence">🎯 {anomalies.confidence}%</span>
        </div>
        {anomalies.anomalies.length === 0 ? (
          <p className="text-xs text-[#10b981] font-semibold">✓ No significant anomalies detected in recent data.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anomalies.anomalies.slice(0, 3).map((a: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.18)]">
                <div>
                  <span className="text-xs font-bold text-[#ef4444]">
                    {a.anomaly_type} Detected
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {a.date} · {a.crime_count} crimes · Top: {a.top_crime_type}
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#ef4444]">⚠ {a.avg_severity}/10</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-[11px] text-[var(--text-muted)] mt-2">Model: {anomalies.model} · {anomalies.total_anomalous_days} anomalous days found</div>
      </div>

      {/* Temporal Patterns */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🕐</span>
          <span className="font-extrabold text-[14px] text-[var(--text-primary)]">Temporal Patterns</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {patterns.slice(0, 3).map((p, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">{p.pattern}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{p.incident_count} incidents recorded</div>
              </div>
              <span className="chip-confidence text-[11px]">{p.confidence}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      flex: 1, textAlign: "center", padding: "6px 8px", borderRadius: 8,
      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}
