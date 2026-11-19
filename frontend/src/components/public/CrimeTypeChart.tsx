"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CrimeBreakdown } from "@/lib/api";

const COLORS: Record<string, string> = {
  Snatching:     "#ef4444",
  Robbery:       "#f97316",
  Pickpocketing: "#f59e0b",
  Theft:         "#eab308",
  Assault:       "#8b5cf6",
  Vandalism:     "#06b6d4",
  Other:         "#6b7280",
};

interface Props { data: CrimeBreakdown[]; }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CrimeBreakdown;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg p-3 min-w-[140px]">
      <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS[d.category] || "var(--text-primary)" }}>{d.category}</div>
      <div className="text-xs text-[var(--text-secondary)]">{d.count} incidents</div>
      <div className="text-xs text-[var(--text-secondary)]">{d.percentage}% of total</div>
    </div>
  );
};

export default function CrimeTypeChart({ data }: Props) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, rgba(0,0,0,0.06))" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="category" type="category" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-card-hover)" }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((entry) => (
              <Cell key={entry.category} fill={COLORS[entry.category] || "#6b7280"} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
