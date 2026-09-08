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
      <div className="ai-panel" style={{ padding: "1rem 1.25rem", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>{spike.spike_predicted ? "📈" : "📊"}</span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Crime Spike Prediction</span>
          </div>
          <span className="chip-confidence">🎯 {spike.confidence}%</span>
        </div>
        <p style={{ fontSize: "0.88rem", color: spike.spike_predicted ? "#f87171" : "#4ade80", fontWeight: 600, marginBottom: 4 }}>
          {spike.message}
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>{spike.detail}</p>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <MetricPill label="This week" value={spike.recent_7_days} />
          <MetricPill label="Last week" value={spike.prior_7_days} />
          <MetricPill label="Trend ratio" value={spike.trend_ratio} />
        </div>
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: 8 }}>Model: {spike.model}</div>
      </div>

      {/* Anomalies */}
      <div className="ai-panel" style={{ padding: "1rem 1.25rem", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.2rem" }}>🔍</span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Anomaly Detection</span>
          </div>
          <span className="chip-confidence">🎯 {anomalies.confidence}%</span>
        </div>
        {anomalies.anomalies.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "#4ade80" }}>✓ No significant anomalies detected in recent data.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anomalies.anomalies.slice(0, 3).map((a, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f87171" }}>
                    {a.anomaly_type} Detected
                  </span>
                  <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)" }}>
                    {a.date} · {a.crime_count} crimes · Top: {a.top_crime_type}
                  </div>
                </div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f87171" }}>⚠ {a.avg_severity}/10</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: 8 }}>Model: {anomalies.model} · {anomalies.total_anomalous_days} anomalous days found</div>
      </div>

      {/* Temporal Patterns */}
      <div className="ai-panel" style={{ padding: "1rem 1.25rem", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🕐</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Temporal Patterns</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {patterns.slice(0, 3).map((p, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{p.pattern}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>{p.incident_count} incidents recorded</div>
              </div>
              <span className="chip-confidence">{p.confidence}%</span>
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
