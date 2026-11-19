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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg p-3 min-w-[180px]">
      <div className="font-bold text-xs text-[var(--text-secondary)] mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-xs">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold tabular-nums text-[var(--text-primary)]">{p.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
};

export default function ForecastChart({ data }: Props) {
  // Merge historical + forecast into one series
  const allPoints = [
    ...data.historical.map((p: any) => ({ date: p.date.slice(5), actual: p.incidents, forecast: null, low: null, high: null })),
    ...data.forecast.map((p: any) => ({ date: p.date.slice(5), actual: null, forecast: p.incidents, low: p.conf_low, high: p.conf_high })),
  ];

  const splitIdx = data.historical.length;
  const splitDate = allPoints[splitIdx]?.date;

  return (
    <div>
      {/* Metrics row */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: "RMSE", value: data.metrics.rmse },
          { label: "R² Score", value: data.metrics.r2 },
          { label: "MAE", value: data.metrics.mae },
        ].map(m => (
          <div key={m.label} className="flex-1 min-w-[80px] p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">{m.label}</div>
            <div className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">{m.value}</div>
          </div>
        ))}
        <div className="flex-1 min-w-[100px] flex items-center justify-center">
          <span className="chip-confidence text-xs py-1 px-3">🧠 {data.confidence}% confidence</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={allPoints} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#d97706" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, rgba(0,0,0,0.06))" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {splitDate && (
              <ReferenceLine x={splitDate} stroke="var(--border-strong, rgba(0,0,0,0.2))" strokeDasharray="4 4" label={{ value: "Forecast →", fill: "var(--text-muted)", fontSize: 10, position: "insideTopRight" }} />
            )}
            {/* Confidence band */}
            <Area dataKey="high" stroke="none" fill="url(#confBand)" legendType="none" />
            <Area dataKey="low" stroke="none" fill="var(--bg-card)" legendType="none" />
            {/* Lines */}
            <Line dataKey="actual" name="Historical" stroke="#059669" strokeWidth={2} dot={false} connectNulls={false} />
            <Line dataKey="forecast" name="Forecast" stroke="#d97706" strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill: "#d97706", r: 3 }} connectNulls={false} />
            <Legend
              formatter={(v) => <span className="text-xs text-[var(--text-secondary)] font-medium">{v}</span>}
              iconType="circle" iconSize={8}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[11px] text-[var(--text-muted)] text-right">
        Model: {data.model}
      </div>
    </div>
  );
}
