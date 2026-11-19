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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg p-2.5">
      <div className="font-bold text-xs text-[var(--text-primary)]">{d.label}</div>
      <div className="text-xs text-[var(--text-secondary)]">{d.count} incidents</div>
    </div>
  );
};

export default function PeakHoursChart({ data }: Props) {
  return (
    <div>
      {/* Warning banner */}
      <div className="flex items-center gap-2.5 mb-4 p-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)]">
        <span className="text-base">⚠️</span>
        <div>
          <span className="font-extrabold text-[#ef4444] text-xs">Peak window: </span>
          <span className="text-xs text-[var(--text-secondary)]">{data.peak_window} — {data.peak_count} incidents recorded</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.hourly_data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, rgba(0,0,0,0.06))" vertical={false} />
            <XAxis
              dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }}
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
