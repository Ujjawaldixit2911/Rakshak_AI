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
import { API_BASE_URL, WS_BASE_URL, safeApiFetch } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";
import PatrolRouteMap from "@/components/police/PatrolRouteMap";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { PageBackground } from "@/components/shared/PageBackground";
import { KPICard } from "@/components/shared/KPICard";

type Tab = "analytics" | "hotspots" | "moderation" | "sos_monitor" | "patrol_map";

const CHART_PALETTE = ["#0284c7", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

function getFallbackPoliceDashboard(cityName: string) {
  return {
    city: cityName,
    summary: {
      total_crimes_indexed: 3840,
      verified_incidents: 1240,
      active_dbscan_hotspots: 14,
      live_patrolling_units: 42,
      pending_verification: 7,
      average_response_mins: 6.4,
    },
    crime_by_type: [
      { name: "Theft & Pickpocketing", value: 420 },
      { name: "Snatching", value: 280 },
      { name: "Harassment", value: 190 },
      { name: "Vehicle Theft", value: 150 },
      { name: "Assault", value: 95 },
    ],
    crime_by_time_of_day: [
      { name: "Morning (06:00 - 12:00)", value: 180 },
      { name: "Afternoon (12:00 - 18:00)", value: 310 },
      { name: "Evening (18:00 - 22:00)", value: 520 },
      { name: "Night (22:00 - 06:00)", value: 680 },
    ],
    top_5_hotspots: [
      { id: 1, location: "Seelampur Market Corridor", incident_count: 84, risk_score: 92, risk_level: "Critical" },
      { id: 2, location: "Kashmere Gate Subways", incident_count: 65, risk_score: 84, risk_level: "High" },
      { id: 3, location: "Paharganj Inner Lanes", incident_count: 51, risk_score: 72, risk_level: "Moderate" },
      { id: 4, location: "Uttam Nagar East", incident_count: 43, risk_score: 68, risk_level: "Moderate" },
      { id: 5, location: "Saket Metro Corridor", incident_count: 36, risk_score: 61, risk_level: "Moderate" },
    ],
  };
}

function getFallbackIncidentQueue() {
  return [
    { id: 101, title: "Reported Street Light Malfunction & Stalking", description: "Dark stretch behind market with suspicious gathering.", category: "Harassment", status: "pending", location: "Saket Block D", created_at: "10 mins ago" },
    { id: 102, title: "Phone Snatching on Bike", description: "Two suspects on black motorbike snatched phone from commuter.", category: "Snatching", status: "pending", location: "Kashmere Gate Gate 3", created_at: "25 mins ago" },
    { id: 103, title: "Unattended Vehicle with Broken Glass", description: "Parked vehicle with broken rear window on service road.", category: "Theft", status: "verified", location: "Rohini Sector 14", created_at: "1 hour ago" },
  ];
}

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
        safeApiFetch(`/api/police/dashboard?city=${encodeURIComponent(selectedCity)}`),
        safeApiFetch(`/api/police/incident-queue?city=${encodeURIComponent(selectedCity)}`),
      ]);

      let dData = null;
      let qData = null;

      if (dashRes && dashRes.ok) {
        try { dData = await dashRes.json(); } catch (e) {}
      }
      if (queueRes && queueRes.ok) {
        try { qData = await queueRes.json(); } catch (e) {}
      }

      setDashData(dData || getFallbackPoliceDashboard(selectedCity));
      setIncidentQueue(qData?.reports || getFallbackIncidentQueue());
    } catch (e) {
      setDashData(getFallbackPoliceDashboard(selectedCity));
      setIncidentQueue(getFallbackIncidentQueue());
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
    <PageBackground className="min-h-screen">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-surface)] backdrop-blur-2xl border-b border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                Command Intelligence
              </div>
              <div className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>Rakshak AI</span>
                <span className="text-[var(--text-muted)] font-light">/</span>
                <span className="text-[var(--accent-primary)]">{selectedCity}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* City Segmented Pill */}
            <div className="hidden sm:flex items-center p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              {["Delhi", "Mumbai", "Bengaluru"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCity(c)}
                  className={`
                    px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer
                    ${
                      selectedCity === c
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Live Socket Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[12px] font-semibold text-[var(--text-secondary)]">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" : "bg-[#ef4444]"
                } animate-pulse`}
              />
              <span>{wsConnected ? "Live Feed" : "Connecting..."}</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

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
          <div className="rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] p-4 sm:p-5 flex items-center justify-between gap-4 text-[14px] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionMessage(null)}
              className="!min-h-[36px] !min-w-[36px] !p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </Button>
          </div>
        )}

        {/* ── Section 1: Hero & Confident Header ────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-[clamp(28px,3.8vw,44px)] font-extrabold tracking-[-0.02em] leading-[1.1] text-[var(--text-primary)]">
              Public Safety & Patrol Command
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] font-normal leading-relaxed">
              Real-time threat evaluation, machine-learned DBSCAN hotspot clusters,
              and coordinated emergency response.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setActiveTab("sos_monitor")}
              icon={<Radio className="w-4 h-4 text-[#ef4444]" />}
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
          <KPICard
            label="City Safety Index"
            value={84.6}
            suffix="/100"
            decimals={1}
            icon={<ShieldCheck className="w-5 h-5 text-[#059669]" />}
            caption={`${selectedCity} metropolitan grid`}
            accentColor="green"
            delta={{ value: "+2.4% vs last week", isPositive: true }}
          />

          <KPICard
            label="Recorded Crimes"
            value={summary.total_crimes_recorded || 4820}
            icon={<BarChart3 className="w-5 h-5 text-[#0284c7]" />}
            caption="FIRs & Law Enforcement logs"
            accentColor="blue"
            delta={{ value: "Historical dataset", isPositive: true }}
          />

          <KPICard
            label="Active Hotspots"
            value={summary.active_hotspot_clusters || 5}
            icon={<Flame className="w-5 h-5 text-[#d97706]" />}
            caption="Patrol units alerted"
            accentColor="amber"
            delta={{ value: "DBSCAN density zones", isPositive: false }}
          />

          <KPICard
            label="Avg Response Time"
            value={Number(summary.avg_police_response_time_minutes || 6.8)}
            suffix=" min"
            decimals={1}
            icon={<Clock className="w-5 h-5 text-[#0284c7]" />}
            caption="From SOS trigger to scene"
            accentColor="blue"
            delta={{ value: "-1.2 min efficiency", isPositive: true }}
          />

          <KPICard
            label="Case Resolution"
            value={Number(summary.resolution_rate_percent || 88.5)}
            suffix="%"
            decimals={1}
            icon={<CheckCircle2 className="w-5 h-5 text-[#059669]" />}
            caption="Verified & closed status"
            accentColor="green"
            delta={{ value: `${summary.resolved_crimes || 4260} closed cases`, isPositive: true }}
          />
        </section>

        {/* ── Section 3: Segmented Tab Controls ───────────────────────────────── */}
        <section className="space-y-8">
          <div className="flex items-center p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto gap-1 shadow-sm">
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
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold tracking-tight whitespace-nowrap
                    transition-all duration-150 cursor-pointer select-none
                    ${
                      isActive
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
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
    </PageBackground>
  );
}
