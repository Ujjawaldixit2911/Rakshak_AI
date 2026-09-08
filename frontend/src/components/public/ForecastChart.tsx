"use client";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { LSTMForecast } from "@/lib/api";

interface Props { data: LSTMForecast; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: "10px 14px", minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "0.83rem" }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
};

export default function ForecastChart({ data }: Props) {
  // Merge historical + forecast into one series
  const allPoints = [
    ...data.historical.map(p => ({ date: p.date.slice(5), actual: p.incidents, forecast: null, low: null, high: null })),
    ...data.forecast.map(p => ({ date: p.date.slice(5), actual: null, forecast: p.incidents, low: p.conf_low, high: p.conf_high })),
  ];

  const splitIdx = data.historical.length;
  const splitDate = allPoints[splitIdx]?.date;

  return (
    <div>
      {/* Metrics row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "RMSE", value: data.metrics.rmse },
          { label: "R² Score", value: data.metrics.r2 },
          { label: "MAE", value: data.metrics.mae },
        ].map(m => (
          <div key={m.label} style={{
            flex: 1, minWidth: 80, padding: "8px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{m.label}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
          </div>
        ))}
        <div style={{
          flex: 1, minWidth: 80, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="chip-confidence">🧠 {data.confidence}% confidence</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={allPoints} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f7cff" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f7cff" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#4a5f82", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: "#4a5f82", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {splitDate && (
              <ReferenceLine x={splitDate} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: "Forecast →", fill: "#8899bb", fontSize: 10, position: "insideTopRight" }} />
            )}
            {/* Confidence band */}
            <Area dataKey="high" stroke="none" fill="url(#confBand)" legendType="none" />
            <Area dataKey="low" stroke="none" fill="#070d1a" legendType="none" />
            {/* Lines */}
            <Line dataKey="actual" name="Historical" stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls={false} />
            <Line dataKey="forecast" name="Forecast" stroke="#4f7cff" strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill: "#4f7cff", r: 3 }} connectNulls={false} />
            <Legend
              formatter={(v) => <span style={{ color: "#8899bb", fontSize: "0.78rem" }}>{v}</span>}
              iconType="circle" iconSize={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 8, fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "right" }}>
        Model: {data.model}
      </div>
    </div>
  );
}
