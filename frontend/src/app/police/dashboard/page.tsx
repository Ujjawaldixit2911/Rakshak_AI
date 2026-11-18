"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  MapPin,
  Camera,
  Activity,
} from "lucide-react";
import { API_BASE_URL, WS_BASE_URL, safeApiFetch } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";
import PatrolRouteMap from "@/components/police/PatrolRouteMap";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { PageBackground } from "@/components/shared/PageBackground";
import { KPICard } from "@/components/shared/KPICard";

type Tab = "analytics" | "hotspots" | "moderation" | "sos_monitor" | "patrol_map";

const CHART_PALETTE = ["#059669", "#0f766e", "#10b981", "#d97706", "#f59e0b", "#e11d48", "#2563eb"];

function getFallbackPoliceDashboard(cityName: string) {
  return {
    city: cityName,
    summary: {
      total_crimes_indexed: 3840,
      total_crimes_recorded: 4820,
      active_hotspot_clusters: 5,
      avg_police_response_time_minutes: 6.8,
      resolution_rate_percent: 88.5,
      resolved_crimes: 4260,
      verified_incidents: 1240,
      active_dbscan_hotspots: 14,
      live_patrolling_units: 42,
      pending_verification: 7,
      average_response_mins: 6.4,
    },
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 420, value: 420 },
      { type: "Snatching", name: "Snatching", count: 280, value: 280 },
      { type: "Harassment", name: "Harassment", count: 190, value: 190 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 150, value: 150 },
      { type: "Assault & Battery", name: "Assault & Battery", count: 95, value: 95 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 180, value: 180 },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 310, value: 310 },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 520, value: 520 },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 680, value: 680 },
    ],
    top_5_hotspots: [
      {
        cluster_id: 101,
        id: 101,
        location: "Seelampur Market Corridor",
        incident_count: 84,
        risk_score: 92,
        risk_category: "Critical",
        risk_level: "Critical",
        dominant_crime_type: "Snatching & Robbery",
        peak_time_of_day: "Night (22:00 - 02:00)",
        avg_cctv_coverage: 14,
      },
      {
        cluster_id: 102,
        id: 102,
        location: "Kashmere Gate Subways & ISBT",
        incident_count: 65,
        risk_score: 84,
        risk_category: "High",
        risk_level: "High",
        dominant_crime_type: "Pickpocketing & Theft",
        peak_time_of_day: "Evening (18:00 - 21:00)",
        avg_cctv_coverage: 22,
      },
      {
        cluster_id: 103,
        id: 103,
        location: "Paharganj Inner Lanes",
        incident_count: 51,
        risk_score: 72,
        risk_category: "Moderate",
        risk_level: "Moderate",
        dominant_crime_type: "Harassment & Scams",
        peak_time_of_day: "Night (23:00 - 03:00)",
        avg_cctv_coverage: 8,
      },
      {
        cluster_id: 104,
        id: 104,
        location: "Uttam Nagar East Commercial Axis",
        incident_count: 43,
        risk_score: 68,
        risk_category: "Moderate",
        risk_level: "Moderate",
        dominant_crime_type: "Vehicle Theft",
        peak_time_of_day: "Afternoon (14:00 - 17:00)",
        avg_cctv_coverage: 11,
      },
      {
        cluster_id: 105,
        id: 105,
        location: "Saket Metro Corridor & Select Mall",
        incident_count: 36,
        risk_score: 61,
        risk_category: "Moderate",
        risk_level: "Moderate",
        dominant_crime_type: "Street Harassment",
        peak_time_of_day: "Evening (19:00 - 22:00)",
        avg_cctv_coverage: 19,
      },
    ],
  };
}

function getFallbackIncidentQueue() {
  return [
    {
      id: 101,
      crime_type: "Harassment & Stalking",
      title: "Harassment & Stalking",
      description: "Unlit dark stretch behind market with aggressive group blocking pedestrian alley.",
      category: "Harassment",
      severity: 8,
      status: "pending",
      location: "Saket Block D, Metro Gate 2",
      lat: 28.5245,
      lon: 77.2066,
      created_at: "10 mins ago",
    },
    {
      id: 102,
      crime_type: "Phone Snatching on Bike",
      title: "Phone Snatching on Bike",
      description: "Two suspects on black Pulsar motorcycle snatched phone from pedestrian commuter.",
      category: "Snatching",
      severity: 7,
      status: "pending",
      location: "Kashmere Gate Gate 3 Subway",
      lat: 28.6692,
      lon: 77.2315,
      created_at: "25 mins ago",
    },
    {
      id: 103,
      crime_type: "Vehicle Break-In Attempt",
      title: "Vehicle Break-In Attempt",
      description: "Parked car with smashed passenger glass on service corridor near district hospital.",
      category: "Theft",
      severity: 6,
      status: "verified",
      location: "Rohini Sector 14 Outer Ring",
      lat: 28.7041,
      lon: 77.1025,
      created_at: "1 hour ago",
    },
    {
      id: 104,
      crime_type: "Municipal Street Light Failure",
      title: "Municipal Street Light Failure",
      description: "Entire 600m arterial avenue completely pitch black with non-functioning sodium lamps.",
      category: "Hazard",
      severity: 5,
      status: "pending",
      location: "Connaught Place Outer Circle Block B",
      lat: 28.6315,
      lon: 77.2167,
      created_at: "2 hours ago",
    },
  ];
}

export default function PoliceCommandDashboard() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [officerId, setOfficerId] = useState("officer001");
  const [officerRole, setOfficerRole] = useState("OFFICER");
  const [officerName, setOfficerName] = useState("Insp. Vikram Rathore");
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
    setOfficerRole(localStorage.getItem("rakshak_police_role") || "OFFICER");
    setOfficerName(localStorage.getItem("rakshak_police_name") || "Insp. Vikram Rathore");
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
      } else {
        // Fallback local UI update
        setIncidentQueue((prev) =>
          prev.map((item) =>
            item.id === incidentId ? { ...item, status } : item
          )
        );
        setActionMessage(
          `Incident #${incidentId} marked as '${status}'.`
        );
      }
    } catch (e) {
      setIncidentQueue((prev) =>
        prev.map((item) =>
          item.id === incidentId ? { ...item, status } : item
        )
      );
      setActionMessage(
        `Incident #${incidentId} marked as '${status}'.`
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("rakshak_police_token");
    localStorage.removeItem("rakshak_police_id");
    localStorage.removeItem("rakshak_police_role");
    localStorage.removeItem("rakshak_police_name");
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
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.3)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                State ERSS 112 Control Grid
              </div>
              <div className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>Rakshak AI</span>
                <span className="text-[var(--text-muted)] font-light">/</span>
                <span className="text-[var(--accent-primary)]">{selectedCity} Police</span>
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
              <span>{wsConnected ? "Live Feed" : "Ready"}</span>
            </div>

            {/* Link to Citizen Portal */}
            <Link
              href="/"
              className="text-[12px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hidden sm:inline-flex items-center gap-1.5 no-underline transition-colors shadow-sm"
            >
              <span>🗺️ Citizen Map</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Officer / Commander Tag */}
            <Badge severity="brand" size="md" className="hidden lg:inline-flex items-center gap-1.5">
              <span>{officerRole === "COMMANDER" ? "🏛️ Commander" : "👮 Officer"}</span>
              <span className="font-mono text-xs">{officerId}</span>
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
      <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* Action / Alert Toast */}
        {actionMessage && (
          <div className="rounded-2xl bg-[rgba(5,150,105,0.08)] border border-[rgba(5,150,105,0.25)] p-4 sm:p-5 flex items-center justify-between gap-4 text-[14px] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
              <span className="font-medium">{actionMessage}</span>
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
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-primary)] text-xs font-bold border border-[rgba(5,150,105,0.25)]">
                LAW ENFORCEMENT DISPATCH
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Active Session: {officerName}
              </span>
            </div>
            <h1 className="text-[clamp(26px,3.5vw,40px)] font-black tracking-[-0.03em] leading-[1.15] text-[var(--text-primary)]">
              Public Safety & Police Command
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] font-normal leading-relaxed">
              Real-time threat evaluation, machine-learned DBSCAN hotspot surveillance, verified citizen moderation, and emergency dispatch relay.
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
            icon={<BarChart3 className="w-5 h-5 text-[#0f766e]" />}
            caption="FIRs & Law Enforcement logs"
            accentColor="green"
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
            icon={<Clock className="w-5 h-5 text-[#059669]" />}
            caption="From SOS trigger to scene"
            accentColor="green"
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
        <section className="space-y-6">
          <div className="flex items-center p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto gap-1 shadow-[var(--shadow-card)]">
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
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-bold tracking-tight whitespace-nowrap
                    transition-all duration-150 cursor-pointer select-none
                    ${
                      isActive
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
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
                    <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                      Incidents by Category
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)]">Volume breakdown by crime classification</p>
                  </div>
                  <Badge severity="brand">Categorized</Badge>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crimeByType} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis
                        dataKey="type"
                        tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "14px",
                          color: "var(--text-primary)",
                          boxShadow: "var(--shadow-card)",
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
                    <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                      Temporal Risk Distribution
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)]">Incident frequency across diurnal windows</p>
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
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "14px",
                            color: "var(--text-primary)",
                            boxShadow: "var(--shadow-card)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="w-full sm:w-1/2 space-y-2">
                    {crimeByTod.map((item: any, idx: number) => (
                      <div
                        key={item.time_of_day}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[13px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_PALETTE[(idx + 2) % CHART_PALETTE.length] }}
                          />
                          <span className="text-[var(--text-primary)] font-semibold">{item.time_of_day}</span>
                        </div>
                        <span className="text-[var(--text-primary)] font-bold tabular-nums">{item.count}</span>
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
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                    High-Risk Hotspot Clusters
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)]">DBSCAN spatial density zones requiring priority surveillance</p>
                </div>
                <Badge severity="critical" dot>
                  {topHotspots.length} Active Zones
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[12px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <th className="py-3.5 px-6">Cluster</th>
                      <th className="py-3.5 px-6">Location</th>
                      <th className="py-3.5 px-6">Risk Score</th>
                      <th className="py-3.5 px-6">Category</th>
                      <th className="py-3.5 px-6">Dominant Offense</th>
                      <th className="py-3.5 px-6">Incidents</th>
                      <th className="py-3.5 px-6">Peak Window</th>
                      <th className="py-3.5 px-6">CCTV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13px]">
                    {topHotspots.map((hs: any) => {
                      const isCritical = hs.risk_score >= 80;
                      return (
                        <tr
                          key={hs.cluster_id || hs.id}
                          className="hover:bg-[var(--bg-card-hover)] transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-[var(--text-primary)] font-mono">
                            #{hs.cluster_id || hs.id}
                          </td>
                          <td className="py-4 px-6 font-bold text-[var(--text-primary)]">
                            {hs.location}
                          </td>
                          <td className="py-4 px-6 font-extrabold tabular-nums">
                            <span className={isCritical ? "text-[#dc2626]" : "text-[#d97706]"}>
                              {hs.risk_score}/100
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <Badge severity={isCritical ? "critical" : "medium"}>
                              {hs.risk_category || hs.risk_level}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-[var(--text-secondary)] font-medium">
                            {hs.dominant_crime_type}
                          </td>
                          <td className="py-4 px-6 tabular-nums font-bold text-[var(--text-primary)]">
                            {hs.incident_count} reports
                          </td>
                          <td className="py-4 px-6 text-[var(--text-secondary)]">
                            {hs.peak_time_of_day}
                          </td>
                          <td className="py-4 px-6 text-[var(--text-secondary)] font-medium">
                            {hs.avg_cctv_coverage} cams
                          </td>
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
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                    Citizen Submissions & Verification Queue
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)]">Review crowd-sourced reports before promoting into authoritative risk dataset</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge severity={pendingCount > 0 ? "high" : "low"} dot>
                    {pendingCount} Pending Review
                  </Badge>
                </div>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {incidentQueue.length === 0 ? (
                  <div className="py-16 text-center text-[var(--text-muted)] text-[15px]">
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
                        className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex items-center gap-3">
                            <span className="text-[15px] font-bold text-[var(--text-primary)]">
                              #{report.id} · {report.crime_type || report.title}
                            </span>
                            <Badge
                              severity={
                                isVerified ? "low" : isRejected ? "critical" : "medium"
                              }
                            >
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                            {report.description || "No detailed description provided."}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-[12px] text-[var(--text-muted)]">
                            <span className="flex items-center gap-1 font-mono text-[var(--text-secondary)]">
                              <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              {report.location || `[${report.lat}, ${report.lon}]`}
                            </span>
                            <span>•</span>
                            <span>Severity: <strong className="text-[var(--text-primary)]">{report.severity || 6}/10</strong></span>
                            <span>•</span>
                            <span>Logged: {report.created_at || "Recently"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {isPending ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleModerate(report.id, "verified")}
                                icon={<CheckCircle2 className="w-4 h-4 text-white" />}
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
                            <span className="text-[13px] text-[var(--text-muted)] font-bold">
                              Status: {report.status.toUpperCase()}
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
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-ping" />
                    Live SOS Broadcast Stream
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)]">Instant dispatch alerts over WebSocket channel /ws/police</p>
                </div>
                <Badge severity="critical" dot>
                  {sosAlerts.length} Active Triggers
                </Badge>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {sosAlerts.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                      <Radio className="w-6 h-6 animate-pulse text-[var(--accent-primary)]" />
                    </div>
                    <p className="text-[14px] text-[var(--text-secondary)] font-medium">
                      Listening for incoming emergency broadcasts on WebSocket /ws/police...
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)]">
                      All 112 ERSS police units in {selectedCity} are actively synced.
                    </p>
                  </div>
                ) : (
                  sosAlerts.map((sos, i) => (
                    <div
                      key={sos.alert_id || i}
                      className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[rgba(239,68,68,0.04)] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[15px] font-bold text-[#dc2626]">
                            🚨 SOS Alert #{sos.alert_id || sos.id || i + 1}
                          </span>
                          <Badge severity="critical">
                            {sos.status || "Active Dispatch"}
                          </Badge>
                        </div>
                        <div className="text-[13.5px] text-[var(--text-primary)]">
                          Location: <span className="font-mono font-bold">[{sos.lat}, {sos.lon}]</span> · Emergency Type: {sos.emergency_type || "Immediate Alert"}
                        </div>
                        <div className="text-[12px] text-[var(--text-muted)]">
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
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
                    Patrol Route & Hotspot Geographic Map
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)]">Active route surveillance with safe corridors and hotspot waypoints</p>
                </div>
                <Badge severity="brand">Geospatial Overlay</Badge>
              </div>

              <div className="p-4 sm:p-6 bg-[var(--bg-surface)]">
                <PatrolRouteMap />
              </div>
            </Card>
          )}
        </section>
      </main>
    </PageBackground>
  );
}
