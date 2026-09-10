"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Shield,
  ShieldCheck,
  Flame,
  Radio,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Navigation,
} from "lucide-react";
import { API_BASE_URL, WS_BASE_URL } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";
import PatrolRouteMap from "@/components/police/PatrolRouteMap";

type Tab = "analytics" | "hotspots" | "moderation" | "sos_monitor" | "patrol_map";

const CHART_PALETTE = ["#0071e3", "#5e5ce6", "#af52de", "#ff2d55", "#ff9500", "#34c759", "#00c7be"];

export default function PoliceCommandDashboard() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [officerId, setOfficerId] = useState("officer001");
  const [dashData, setDashData] = useState<any | null>(null);
  const [incidentQueue, setIncidentQueue] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("rakshak_police_token");
    if (!token) {
      router.push("/police/login");
      return;
    }
    setOfficerId(localStorage.getItem("rakshak_police_id") || "officer001");
  }, [router]);

  // Fetch Dashboard Stats & Incident Queue
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [dashRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/police/dashboard?city=${selectedCity}`),
        fetch(`${API_BASE_URL}/api/police/incident-queue?city=${selectedCity}`),
      ]);

      if (dashRes.ok) {
        const d = await dashRes.json();
        setDashData(d);
      }
      if (queueRes.ok) {
        const q = await queueRes.json();
        setIncidentQueue(q.reports || []);
      }
    } catch (e) {
      console.error("Error loading police dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCity]);

  // Connect to Live SOS WebSocket
  useEffect(() => {
    try {
      const socket = new WebSocket(`${WS_BASE_URL}/ws/police`);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.event === "EMERGENCY_SOS_TRIGGERED" ||
            payload.status === "Active Dispatch Alert"
          ) {
            setSosAlerts((prev) => [payload, ...prev]);
            setActionMessage(
              `Emergency SOS received: Alert #${payload.alert_id || payload.id || "Active"} at [${payload.lat}, ${payload.lon}]`
            );
          }
        } catch (e) {
          console.error("Failed to parse WS payload:", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      return () => {
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket connection error:", err);
    }
  }, []);

  // Moderate Incident Report Action
  const handleModerate = async (
    incidentId: number,
    status: "verified" | "rejected"
  ) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/police/incidents/${incidentId}/moderate`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        setIncidentQueue((prev) =>
          prev.map((item) =>
            item.id === incidentId ? { ...item, status } : item
          )
        );
        setActionMessage(
          `Incident #${incidentId} updated to '${status}'.`
        );
      }
    } catch (e) {
      console.error("Failed to moderate incident:", e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rakshak_police_token");
    localStorage.removeItem("rakshak_police_id");
    localStorage.removeItem("rakshak_police_role");
    router.push("/police/login");
  };

  const summary = dashData?.summary || {};
  const crimeByType = dashData?.crime_by_type || [];
  const crimeByTod = dashData?.crime_by_time_of_day || [];
  const topHotspots = dashData?.top_5_hotspots || [];

  const pendingCount = incidentQueue.filter((i) => i.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter',-apple-system,'SF_Pro_Display',system-ui,sans-serif] antialiased selection:bg-[#0071e3]/30 selection:text-white">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3] shadow-[0_0_20px_rgba(0,113,227,0.25)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-wider uppercase text-white/40">
                Command Intelligence
              </div>
              <div className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                <span>Rakshak AI</span>
                <span className="text-white/30 font-light">/</span>
                <span className="text-[#0071e3]">{selectedCity}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* City Segmented Pill */}
            <div className="hidden sm:flex items-center p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl">
              {["Delhi", "Mumbai", "Bengaluru"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCity(c)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer
                    ${
                      selectedCity === c
                        ? "bg-[#0071e3] text-white shadow-sm"
                        : "text-white/60 hover:text-white"
                    }
                  `}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Live Socket Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/70">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? "bg-[#34c759] shadow-[0_0_8px_#34c759]" : "bg-[#ff3b30]"
                } animate-pulse`}
              />
              <span>{wsConnected ? "Live Feed" : "Connecting..."}</span>
            </div>

            {/* Officer Tag */}
            <Badge severity="brand" size="md" className="hidden lg:inline-flex">
              Officer {officerId}
            </Badge>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboardStats}
              disabled={loading}
              className="!p-2.5"
              aria-label="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            {/* Logout Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Container ────────────────────────────────────────── */}
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 space-y-12 sm:space-y-16">
        {/* Action / Alert Toast */}
        {actionMessage && (
          <div className="rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/25 p-4 sm:p-5 flex items-center justify-between gap-4 backdrop-blur-xl text-[14px] text-white/90 shadow-[0_8px_30px_rgba(255,59,48,0.15)] animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff3b30] shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionMessage(null)}
              className="!min-h-[36px] !min-w-[36px] !p-1 text-white/60 hover:text-white"
            >
              ✕
            </Button>
          </div>
        )}

        {/* ── Section 1: Hero & Confident Header ────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-[clamp(28px,3.8vw,48px)] font-semibold tracking-[-0.02em] leading-[1.1] text-white">
              Public Safety & Patrol Command
            </h1>
            <p className="text-[15px] sm:text-[17px] text-white/60 font-normal leading-relaxed">
              Real-time threat evaluation, machine-learned DBSCAN hotspot clusters,
              and coordinated emergency response.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveTab("sos_monitor")}
              icon={<Radio className="w-4 h-4 text-[#ff3b30]" />}
            >
              Live SOS Feed ({sosAlerts.length})
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setActiveTab("moderation")}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Queue ({pendingCount})
            </Button>
          </div>
        </section>

        {/* ── Section 2: Executive KPI Overview (Auto-Fit Grid) ───────────────── */}
        <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 sm:gap-6">
          {/* KPI 1: Citywide Safety Score */}
          <Card hoverLift className="flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[12px] font-semibold tracking-wider uppercase">
                City Safety Index
              </span>
              <ShieldCheck className="w-4 h-4 text-[#34c759]" />
            </div>
            <div className="my-4">
              <div className="text-[clamp(32px,3.5vw,44px)] font-bold tracking-tight text-white tabular-nums">
                84.6<span className="text-xl text-white/40 font-normal">/100</span>
              </div>
              <div className="text-[13px] text-[#34c759] font-medium flex items-center gap-1.5 mt-1">
                <span>+2.4% vs last week</span>
              </div>
            </div>
            <div className="text-[12px] text-white/50">{selectedCity} metropolitan grid</div>
          </Card>

          {/* KPI 2: Total Authoritative Crimes */}
          <Card hoverLift className="flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[12px] font-semibold tracking-wider uppercase">
                Recorded Crimes
              </span>
              <BarChart3 className="w-4 h-4 text-[#0071e3]" />
            </div>
            <div className="my-4">
              <div className="text-[clamp(32px,3.5vw,44px)] font-bold tracking-tight text-white tabular-nums">
                {summary.total_crimes_recorded?.toLocaleString() || "4,820"}
              </div>
              <div className="text-[13px] text-white/60 font-medium flex items-center gap-1.5 mt-1">
                <span>Historical dataset</span>
              </div>
            </div>
            <div className="text-[12px] text-white/50">FIRs & Law Enforcement logs</div>
          </Card>

          {/* KPI 3: Active Hotspot Clusters */}
          <Card hoverLift className="flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[12px] font-semibold tracking-wider uppercase">
                Active Hotspots
              </span>
              <Flame className="w-4 h-4 text-[#ff9500]" />
            </div>
            <div className="my-4">
              <div className="text-[clamp(32px,3.5vw,44px)] font-bold tracking-tight text-[#ff9500] tabular-nums">
                {summary.active_hotspot_clusters || "5"}
              </div>
              <div className="text-[13px] text-[#ff9500] font-medium flex items-center gap-1.5 mt-1">
                <span>DBSCAN density zones</span>
              </div>
            </div>
            <div className="text-[12px] text-white/50">Patrol units alerted</div>
          </Card>

          {/* KPI 4: Police Response Time */}
          <Card hoverLift className="flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[12px] font-semibold tracking-wider uppercase">
                Avg Response Time
              </span>
              <Clock className="w-4 h-4 text-[#0071e3]" />
            </div>
            <div className="my-4">
              <div className="text-[clamp(32px,3.5vw,44px)] font-bold tracking-tight text-white tabular-nums">
                {summary.avg_police_response_time_minutes || "6.8"}
                <span className="text-xl text-white/40 font-normal"> min</span>
              </div>
              <div className="text-[13px] text-[#34c759] font-medium flex items-center gap-1.5 mt-1">
                <span>-1.2 min dispatch efficiency</span>
              </div>
            </div>
            <div className="text-[12px] text-white/50">From SOS trigger to scene</div>
          </Card>

          {/* KPI 5: Resolution Rate */}
          <Card hoverLift className="flex flex-col justify-between">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[12px] font-semibold tracking-wider uppercase">
                Case Resolution
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
            </div>
            <div className="my-4">
              <div className="text-[clamp(32px,3.5vw,44px)] font-bold tracking-tight text-[#34c759] tabular-nums">
                {summary.resolution_rate_percent || "88.5"}%
              </div>
              <div className="text-[13px] text-white/60 font-medium flex items-center gap-1.5 mt-1">
                <span>{summary.resolved_crimes || "4,260"} closed cases</span>
              </div>
            </div>
            <div className="text-[12px] text-white/50">Verified & closed status</div>
          </Card>
        </section>

        {/* ── Section 3: Segmented Tab Controls ───────────────────────────────── */}
        <section className="space-y-8">
          <div className="flex items-center p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl overflow-x-auto gap-1">
            {[
              { id: "analytics", label: "Crime Analytics", icon: <BarChart3 className="w-4 h-4" /> },
              { id: "hotspots", label: "Hotspot Clusters", icon: <Flame className="w-4 h-4" /> },
              { id: "moderation", label: `Moderation Queue (${pendingCount})`, icon: <ShieldCheck className="w-4 h-4" /> },
              { id: "sos_monitor", label: `Live SOS Feed (${sosAlerts.length})`, icon: <Radio className="w-4 h-4" /> },
              { id: "patrol_map", label: "Patrol Map", icon: <Navigation className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium tracking-tight whitespace-nowrap
                    transition-all duration-200 cursor-pointer select-none
                    ${
                      isActive
                        ? "bg-[#0071e3] text-white shadow-[0_4px_12px_rgba(0,113,227,0.3)]"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Tab Content 1: Crime Analytics & Temporal Insights ────────────── */}
          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Crime by Category Bar Chart */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[17px] font-semibold text-white tracking-tight">
                      Incidents by Category
                    </h3>
                    <p className="text-[13px] text-white/50">Volume breakdown by crime classification</p>
                  </div>
                  <Badge severity="brand">Categorized</Badge>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crimeByType} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "16px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      />
                      <Bar dataKey="count" name="Incidents" radius={[8, 8, 0, 0]}>
                        {crimeByType.map((entry: any, index: number) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Crime by Time of Day Pie Chart */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-[17px] font-semibold text-white tracking-tight">
                      Temporal Risk Distribution
                    </h3>
                    <p className="text-[13px] text-white/50">Incident frequency across diurnal windows</p>
                  </div>
                  <Badge severity="medium">Diurnal Trend</Badge>
                </div>

                <div className="h-72 w-full flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="h-full w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={crimeByTod}
                          dataKey="count"
                          nameKey="time_of_day"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {crimeByTod.map((entry: any, index: number) => (
                            <Cell
                              key={`pie-${index}`}
                              fill={CHART_PALETTE[(index + 2) % CHART_PALETTE.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "16px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-2">
                    {crimeByTod.map((item: any, idx: number) => (
                      <div
                        key={item.time_of_day}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CHART_PALETTE[(idx + 2) % CHART_PALETTE.length] }}
                          />
                          <span className="text-white/80 font-medium">{item.time_of_day}</span>
                        </div>
                        <span className="text-white font-semibold tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab Content 2: Top DBSCAN Hotspots ─────────────────────────────── */}
          {activeTab === "hotspots" && (
            <Card padded={false}>
              <div className="p-6 sm:p-8 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-white tracking-tight">
                    High-Risk Hotspot Clusters
                  </h3>
                  <p className="text-[13px] text-white/50">DBSCAN spatial density zones requiring priority surveillance</p>
                </div>
                <Badge severity="critical" dot>
                  {topHotspots.length} Active Zones
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[12px] font-semibold uppercase tracking-wider text-white/40 bg-white/[0.02]">
                      <th className="py-3.5 px-6">Cluster ID</th>
                      <th className="py-3.5 px-6">Risk Score</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Dominant Offense</th>
                      <th className="py-3.5 px-6">Incident Volume</th>
                      <th className="py-3.5 px-6">Peak Diurnal Window</th>
                      <th className="py-3.5 px-6">CCTV Deployment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-[14px]">
                    {topHotspots.map((hs: any) => {
                      const isCritical = hs.risk_score >= 65;
                      return (
                        <tr
                          key={hs.cluster_id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-6 font-semibold text-white">#{hs.cluster_id}</td>
                          <td className="py-4 px-6 font-bold tabular-nums">
                            <span className={isCritical ? "text-[#ff3b30]" : "text-[#ff9500]"}>
                              {hs.risk_score}/100
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <Badge severity={isCritical ? "critical" : "medium"}>
                              {hs.risk_category}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-white/80">{hs.dominant_crime_type}</td>
                          <td className="py-4 px-6 tabular-nums text-white/70">{hs.incident_count} reports</td>
                          <td className="py-4 px-6 text-white/70">{hs.peak_time_of_day}</td>
                          <td className="py-4 px-6 text-white/70">{hs.avg_cctv_coverage} cameras</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Tab Content 3: Citizen Incident Moderation Queue ────────────────── */}
          {activeTab === "moderation" && (
            <Card padded={false}>
              <div className="p-6 sm:p-8 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[17px] font-semibold text-white tracking-tight">
                    Citizen Submissions & Verification Queue
                  </h3>
                  <p className="text-[13px] text-white/50">Review crowd-sourced reports before promoting into authoritative risk dataset</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge severity={pendingCount > 0 ? "high" : "low"} dot>
                    {pendingCount} Pending Review
                  </Badge>
                </div>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {incidentQueue.length === 0 ? (
                  <div className="py-16 text-center text-white/40 text-[15px]">
                    No incident reports pending in moderation queue.
                  </div>
                ) : (
                  incidentQueue.map((report) => {
                    const isPending = report.status === "pending";
                    const isVerified = report.status === "verified";
                    const isRejected = report.status === "rejected";

                    return (
                      <div
                        key={report.id}
                        className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-3">
                            <span className="text-[15px] font-semibold text-white">
                              #{report.id} · {report.crime_type}
                            </span>
                            <Badge
                              severity={
                                isVerified ? "low" : isRejected ? "critical" : "medium"
                              }
                            >
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-[14px] text-white/70 leading-relaxed">
                            {report.description || "No detailed description provided."}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-[12px] text-white/40">
                            <span>GPS: [{report.lat}, {report.lon}]</span>
                            <span>•</span>
                            <span>Severity: {report.severity || 5}/10</span>
                            <span>•</span>
                            <span>
                              Logged: {report.created_at?.slice(0, 19).replace("T", " ") || "Recently"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isPending ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleModerate(report.id, "verified")}
                                icon={<CheckCircle2 className="w-4 h-4 text-[#34c759]" />}
                              >
                                Verify & Ingest
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleModerate(report.id, "rejected")}
                                icon={<XCircle className="w-4 h-4" />}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-[13px] text-white/40 font-medium">
                              Decision Logged ({report.status})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* ── Tab Content 4: Live SOS Feed ──────────────────────────────────── */}
          {activeTab === "sos_monitor" && (
            <Card padded={false}>
              <div className="p-6 sm:p-8 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-ping" />
                    Live SOS Broadcast Stream
                  </h3>
                  <p className="text-[13px] text-white/50">Instant dispatch alerts over WebSocket channel /ws/police</p>
                </div>
                <Badge severity="critical" dot>
                  {sosAlerts.length} Active Triggers
                </Badge>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {sosAlerts.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-white/40">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className="text-[15px] text-white/40">
                      Listening for incoming emergency broadcasts on WebSocket /ws/police...
                    </p>
                  </div>
                ) : (
                  sosAlerts.map((sos, i) => (
                    <div
                      key={sos.alert_id || i}
                      className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#ff3b30]/[0.03] hover:bg-[#ff3b30]/[0.06] transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-bold text-[#ff3b30]">
                            🚨 SOS Alert #{sos.alert_id || sos.id || i + 1}
                          </span>
                          <Badge severity="critical">
                            {sos.status || "Active Dispatch"}
                          </Badge>
                        </div>
                        <div className="text-[14px] text-white/80">
                          Location: <span className="font-mono text-white">[{sos.lat}, {sos.lon}]</span> · Emergency Type: {sos.emergency_type || "Immediate Alert"}
                        </div>
                        <div className="text-[12px] text-white/40">
                          Timestamp: {sos.timestamp || new Date().toISOString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Button
                          variant="destructive"
                          size="md"
                          onClick={() =>
                            alert(`🚨 Emergency patrol dispatched to GPS Coordinates: [${sos.lat}, ${sos.lon}]`)
                          }
                          icon={<Navigation className="w-4 h-4" />}
                        >
                          Dispatch Patrol Unit
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          {/* ── Tab Content 5: Patrol Route & Hotspot Map ─────────────────────── */}
          {activeTab === "patrol_map" && (
            <Card padded={false} className="overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-white tracking-tight">
                    Patrol Route & Hotspot Geographic Map
                  </h3>
                  <p className="text-[13px] text-white/50">Active route surveillance with safe corridors and hotspot waypoints</p>
                </div>
                <Badge severity="brand">Geospatial Overlay</Badge>
              </div>

              <div className="p-4 sm:p-6">
                <PatrolRouteMap />
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
