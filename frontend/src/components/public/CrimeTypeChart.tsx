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
    <div className="card" style={{ padding: "10px 14px", minWidth: 140 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: COLORS[d.category] || "#8899bb" }}>{d.category}</div>
      <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{d.count} incidents</div>
      <div style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{d.percentage}% of total</div>
    </div>
  );
};

export default function CrimeTypeChart({ data }: Props) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#4a5f82", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis dataKey="category" type="category" tick={{ fill: "#8899bb", fontSize: 12 }} axisLine={false} tickLine={false} width={95} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
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
