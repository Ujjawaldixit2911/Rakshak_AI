"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  TrendingUp,
  Clock,
  MapPin,
  PieChart as PieIcon,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  Calendar
} from "lucide-react";

interface AreaSummary {
  area: string;
  crimeCount: number;
  riskIndex: string;
  hotspotsCount: number;
  primaryCrimeType: string;
}

interface HourlyPoint {
  hour: string;
  count: number;
  riskMultiplier: number;
  isNightWindow: boolean;
}

interface DayPoint {
  day: string;
  count: number;
}

interface CrimeTypeItem {
  type: string;
  count: number;
  percentage: number;
  severity: string;
}

interface RiskTrendPoint {
  date: string;
  avgSafetyScore: number;
  reportedCrimes: number;
  sosAlertsCount: number;
  verifiedIncidents: number;
}

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6", "#06b6d4"];

export const AnalyticsDashboard: React.FC = () => {
  const [areaData, setAreaData] = useState<AreaSummary[]>([]);
  const [timeData, setTimeData] = useState<{
    hourly: HourlyPoint[];
    dayOfWeek: DayPoint[];
    peakRiskWindow: string;
  } | null>(null);
  const [typeData, setTypeData] = useState<CrimeTypeItem[]>([]);
  const [trendData, setTrendData] = useState<RiskTrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [areaRes, timeRes, typeRes, trendRes] = await Promise.all([
        fetch(`${apiBase}/api/analytics/crime-by-area`),
        fetch(`${apiBase}/api/analytics/crime-by-time`),
        fetch(`${apiBase}/api/analytics/crime-by-type`),
        fetch(`${apiBase}/api/analytics/risk-trend?days=${trendDays}`)
      ]);

      if (!areaRes.ok || !timeRes.ok || !typeRes.ok || !trendRes.ok) {
        throw new Error("Failed to fetch analytics datasets from server");
      }

      const [areas, times, types, trends] = await Promise.all([
        areaRes.json(),
        timeRes.json(),
        typeRes.json(),
        trendRes.json()
      ]);

      setAreaData(areas);
      setTimeData(times);
      setTypeData(types);
      setTrendData(trends.trends || []);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load analytics summaries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [trendDays]);

  const handleRecompute = async () => {
    setRefreshing(true);
    try {
      await fetch(`${apiBase}/api/analytics/recompute`, { method: "POST" });
      await fetchAllAnalytics();
    } catch (err) {
      console.error("Recompute error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const totalCrimeCount = areaData.reduce((acc, a) => acc + a.crimeCount, 0);
  const totalHotspots = areaData.reduce((acc, a) => acc + a.hotspotsCount, 0);
  const avgRiskScore =
    trendData.length > 0
      ? (
          trendData.reduce((acc, t) => acc + t.avgSafetyScore, 0) / trendData.length
        ).toFixed(1)
      : "78.2";

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Intelligence & Safety Analytics
              </h1>
              <p className="text-sm text-slate-400">
                Read-replica analytical aggregations over Crimes, SOS Triggers & Risk Trends
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecompute}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Recompute Summaries</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>TOTAL ANALYZED INCIDENTS</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{totalCrimeCount.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-medium">Authoritative & Reports</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>DBSCAN CLUSTERS & HOTSPOTS</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{totalHotspots}</span>
            <span className="text-xs text-amber-400 font-medium">Active Safe Guard Zones</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>PEAK RISK WINDOW</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {timeData?.peakRiskWindow || "20:00 - 02:00"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>CITYWIDE SAFETY INDEX</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{avgRiskScore}</span>
            <span className="text-xs text-slate-400 font-medium">/ 100 benchmark</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 1. Temporal 24-Hour Crime Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Crime vs. Time of Day (24h Curve)
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Hourly aggregate
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeData?.hourly || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="crimeTimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Incident Count"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#crimeTimeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Crime Distribution by Area / Region */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Crime by District / Area
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Regional density
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="area" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Bar dataKey="crimeCount" name="Crimes" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Crime Category Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Incident Categorization & Types
              </h3>
            </div>
          </div>
          <div className="h-64 w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="h-full w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
              {typeData.map((item, idx) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/40 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-slate-300 font-medium truncate max-w-[120px]">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 tabular-nums">{item.percentage}%</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        item.severity === "HIGH"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Multi-Day Safety & Risk Trend */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-Day Safety Trend
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    trendDays === d
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[50, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                <Line
                  type="monotone"
                  dataKey="avgSafetyScore"
                  name="Safety Score"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="reportedCrimes"
                  name="Daily Crimes"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
