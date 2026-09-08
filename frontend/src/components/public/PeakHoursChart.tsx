"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { PeakHours } from "@/lib/api";

interface Props { data: PeakHours; }

function getColor(intensity: number): string {
  if (intensity >= 0.75) return "#ef4444";
  if (intensity >= 0.50) return "#f97316";
  if (intensity >= 0.25) return "#f59e0b";
  return "#22c55e";
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card" style={{ padding: "8px 12px" }}>
      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{d.label}</div>
      <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>{d.count} incidents</div>
    </div>
  );
};

export default function PeakHoursChart({ data }: Props) {
  return (
    <div>
      {/* Warning banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        padding: "10px 14px", borderRadius: 9,
        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
      }}>
        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
        <div>
          <span style={{ fontWeight: 700, color: "#f87171", fontSize: "0.88rem" }}>Peak window: </span>
          <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>{data.peak_window} — {data.peak_count} incidents recorded</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.hourly_data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label" tick={{ fill: "#4a5f82", fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={2}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="count"
              stroke="#ef4444" strokeWidth={2}
              fill="url(#peakGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
