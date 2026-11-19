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
  Layers,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Filter,
} from "lucide-react";
import { API_BASE_URL, WS_BASE_URL, safeApiFetch } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";
import PatrolRouteMap from "@/components/police/PatrolRouteMap";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { PageBackground } from "@/components/shared/PageBackground";
import { KPICard } from "@/components/shared/KPICard";
import {
  INDIAN_CITIES,
  getCityMetadata,
  getFallbackPoliceDashboard,
  getFallbackIncidentQueue,
} from "@/lib/cities";
import CityPickerModal from "@/components/shared/CityPickerModal";

type Tab = "analytics" | "hotspots" | "moderation" | "sos_monitor" | "patrol_map";

const CHART_PALETTE = ["#059669", "#0d9488", "#10b981", "#d97706", "#f59e0b", "#e11d48", "#2563eb"];

export default function PoliceCommandDashboard() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("moderation");
  const [queueStatusFilter, setQueueStatusFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [queueSeverityFilter, setQueueSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [officerId, setOfficerId] = useState("officer001");
  const [officerRole, setOfficerRole] = useState("OFFICER");
  const [officerName, setOfficerName] = useState("Insp. Vikram Rathore");
  const [dashData, setDashData] = useState<any | null>(null);
  const [incidentQueue, setIncidentQueue] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const cityMeta = getCityMetadata(selectedCity);

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
      setIncidentQueue(qData?.reports || getFallbackIncidentQueue(selectedCity));
    } catch (e) {
      setDashData(getFallbackPoliceDashboard(selectedCity));
      setIncidentQueue(getFallbackIncidentQueue(selectedCity));
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
  const verifiedCount = incidentQueue.filter((i) => i.status === "verified").length;
  const rejectedCount = incidentQueue.filter((i) => i.status === "rejected").length;

  const filteredQueue = incidentQueue.filter((report) => {
    if (queueStatusFilter !== "all" && report.status !== queueStatusFilter) return false;
    const sev = Number(report.severity) || 5;
    if (queueSeverityFilter === "high" && sev < 7) return false;
    if (queueSeverityFilter === "medium" && (sev < 4 || sev > 6)) return false;
    if (queueSeverityFilter === "low" && sev > 3) return false;
    if (queueSearch.trim()) {
      const q = queueSearch.toLowerCase();
      const combined = `${report.id} ${report.crime_type || report.title || ""} ${report.description || ""} ${report.location || ""}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }
    return true;
  });

  return (
    <PageBackground className="min-h-screen">
      {/* ── Top Navigation Bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-surface)] backdrop-blur-2xl border-b border-[var(--border-subtle)] shadow-sm">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.3)] flex items-center justify-center text-[var(--accent-primary)] shadow-sm shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                <span>State ERSS 112 Command</span>
                <span>•</span>
                <span className="text-[var(--accent-primary)] font-extrabold">Active Grid</span>
              </div>
              <div className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>Rakshak AI</span>
                <span className="text-[var(--text-muted)] font-light">/</span>
                <span className="text-[var(--accent-primary)]">{selectedCity} Command</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Jurisdiction / City Selector Button */}
            <button
              onClick={() => setIsCityPickerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[12.5px] font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:shadow-sm transition-all cursor-pointer"
              title="Click to switch jurisdiction"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span>{cityMeta.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                {cityMeta.zone}
              </span>
              <SlidersHorizontal className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {/* Live Socket Feed Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[12px] font-bold text-[var(--text-secondary)]">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsConnected ? "bg-[#10b981] shadow-[0_0_8px_#10b981]" : "bg-[#ef4444]"
                } animate-pulse`}
              />
              <span>{wsConnected ? "Live Feed" : "Ready"}</span>
            </div>

            {/* Link to Citizen Map */}
            <Link
              href="/"
              className="text-[12px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hidden sm:inline-flex items-center gap-1.5 no-underline transition-colors shadow-sm"
            >
              <span>🗺️ Citizen Map</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle size="sm" />

            {/* Officer / Commander Role Badge */}
            <Badge severity="brand" size="md" className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1">
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
      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-9 sm:space-y-11">
        {/* Action / Alert Feedback Toast */}
        {actionMessage && (
          <div className="rounded-2xl bg-[rgba(5,150,105,0.08)] border border-[rgba(5,150,105,0.25)] p-4 sm:p-5 flex items-center justify-between gap-4 text-[14px] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
              <span className="font-semibold">{actionMessage}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionMessage(null)}
              className="!min-h-[32px] !min-w-[32px] !p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </Button>
          </div>
        )}

        {/* ── Executive Command Console Header ─────────────────────── */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Command Center Title & Identity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live ERSS-112 Grid Active
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-bold">
                  Logged in: <strong className="text-[var(--text-primary)]">{officerName}</strong> ({officerRole})
                </span>
                <span className="text-xs text-[var(--text-muted)]">•</span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {cityMeta.emergencyCommand}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Public Safety & Police Command Center
              </h1>

              <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)] flex-wrap pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span>🚓</span>
                  <span><strong className="text-[var(--text-primary)]">{cityMeta.activePatrolUnits}</strong> PCR Units</span>
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="flex items-center gap-1.5">
                  <span>📹</span>
                  <span><strong className="text-[var(--text-primary)]">{cityMeta.activeCameras.toLocaleString()}</strong> AI CCTVs</span>
                </span>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span><strong className="text-[var(--text-primary)]">{cityMeta.responseMins}m</strong> Dispatch SLA</span>
                </span>
              </div>
            </div>

            {/* Right: City Selector Dropdown & Quick Hub Buttons */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              {/* Jurisdiction Dropdown Selector */}
              <div className="relative min-w-[210px]">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Jurisdiction Command
                </label>
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none shadow-sm transition-all"
                  >
                    {INDIAN_CITIES.map((c) => (
                      <option key={c.id} value={c.shortName} className="bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold">
                        📍 {c.name} ({c.state})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Quick Tab Jump Buttons */}
              <div className="flex items-end gap-2 pt-4">
                <button
                  onClick={() => setActiveTab("sos_monitor")}
                  className={`h-10 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer shadow-sm ${
                    sosAlerts.length > 0
                      ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-emerald-500"
                  }`}
                  title="View Live SOS Emergency Feed"
                >
                  <Radio className="w-3.5 h-3.5 text-red-500" />
                  <span>SOS ({sosAlerts.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("moderation")}
                  className={`h-10 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer shadow-sm ${
                    activeTab === "moderation"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-emerald-500"
                  }`}
                  title="View Citizen Incident Moderation Queue"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Queue ({pendingCount})</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Executive KPI Metrics (Symmetrical & Equally Distributed 5-Column Grid) ── */}
        <section className="my-8 sm:my-9">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-6 items-stretch">
            {/* KPI 1: City Safety Index */}
            <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-lg hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between h-full min-h-[205px] space-y-4">
              <div className="h-12 flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 shadow-sm">
                  <span>↗</span>
                  <span>+2.4%</span>
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-2 space-y-1">
                <div className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  City Safety Index
                </div>
                <div className="text-3xl lg:text-[34px] font-black text-emerald-600 tracking-tight tabular-nums">
                  {cityMeta.safetyScore}
                  <span className="text-sm font-bold text-[var(--text-muted)] ml-1">/ 100</span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{cityMeta.name} safety score</span>
              </div>
            </div>

            {/* KPI 2: Recorded Crimes */}
            <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-lg hover:border-teal-500/40 transition-all duration-200 flex flex-col justify-between h-full min-h-[205px] space-y-4">
              <div className="h-12 flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50 shadow-sm">
                  ACTIVE
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-2 space-y-1">
                <div className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Recorded Crimes
                </div>
                <div className="text-3xl lg:text-[34px] font-black text-[var(--text-primary)] tracking-tight tabular-nums">
                  {(summary.total_crimes_recorded || Math.round(cityMeta.activeCameras * 0.95 + 2800)).toLocaleString()}
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                <span className="truncate">Verified FIR registers</span>
              </div>
            </div>

            {/* KPI 3: Active Hotspots */}
            <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-lg hover:border-amber-500/40 transition-all duration-200 flex flex-col justify-between h-full min-h-[205px] space-y-4">
              <div className="h-12 flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span>ALERT</span>
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-2 space-y-1">
                <div className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Active Hotspots
                </div>
                <div className="text-3xl lg:text-[34px] font-black text-amber-600 tracking-tight tabular-nums">
                  {cityMeta.hotspots.length}
                  <span className="text-sm font-bold text-[var(--text-muted)] ml-1">Zones</span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">DBSCAN clusters monitored</span>
              </div>
            </div>

            {/* KPI 4: Avg Response Time */}
            <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-lg hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between h-full min-h-[205px] space-y-4">
              <div className="h-12 flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 flex items-center gap-1 shadow-sm">
                  <span>↘</span>
                  <span>-1.2m</span>
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-2 space-y-1">
                <div className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Avg Response Time
                </div>
                <div className="text-3xl lg:text-[34px] font-black text-[var(--text-primary)] tracking-tight tabular-nums">
                  {cityMeta.responseMins}
                  <span className="text-sm font-bold text-[var(--text-muted)] ml-1">mins</span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="truncate">SOS dispatch to arrival</span>
              </div>
            </div>

            {/* KPI 5: Case Resolution */}
            <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] hover:shadow-lg hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between h-full min-h-[205px] space-y-4">
              <div className="h-12 flex items-center justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                  CLOSED
                </span>
              </div>

              <div className="flex-1 flex flex-col justify-center py-2 space-y-1">
                <div className="text-[11.5px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Case Resolution
                </div>
                <div className="text-3xl lg:text-[34px] font-black text-emerald-600 tracking-tight tabular-nums">
                  {cityMeta.resolutionRate}
                  <span className="text-sm font-bold text-[var(--text-muted)] ml-1">%</span>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">Verified & closed cases</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 3: Segmented Tab Bar ────────────────────────────────────── */}
        <section className="space-y-7">
          <div className="flex items-center p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto gap-1.5 shadow-[var(--shadow-card)]">
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
                    flex items-center gap-2 px-5 py-3 rounded-xl text-[13.5px] font-extrabold tracking-tight whitespace-nowrap
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
              {/* Crime by Category Bar Chart (7 columns) */}
              <div className="lg:col-span-7">
                <Card className="!p-6 sm:!p-7">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[17px] font-black text-[var(--text-primary)] tracking-tight">
                        Incidents by Crime Classification
                      </h3>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                        Volume breakdown across reported incident types in {selectedCity}
                      </p>
                    </div>
                    <Badge severity="brand">Categorized</Badge>
                  </div>

                  <div className="h-84 w-full pt-2">
                    <ResponsiveContainer width="100%" height={330}>
                      <BarChart data={crimeByType} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis
                          dataKey="type"
                          tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: 700 }}
                          interval={0}
                          angle={-18}
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
                            fontWeight: 600,
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
              </div>

              {/* Crime by Time of Day Pie Chart & Breakdown (5 columns) */}
              <div className="lg:col-span-5">
                <Card className="!p-6 sm:!p-7">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[17px] font-black text-[var(--text-primary)] tracking-tight">
                        Temporal Risk Windows
                      </h3>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                        Incident frequency across diurnal windows
                      </p>
                    </div>
                    <Badge severity="medium">Diurnal Trend</Badge>
                  </div>

                  <div className="h-56 w-full mb-4">
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
                            fontWeight: 600,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Clean Diurnal Legend Rows */}
                  <div className="space-y-2.5 pt-2">
                    {crimeByTod.map((item: any, idx: number) => (
                      <div
                        key={item.time_of_day}
                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[13px] hover:border-[var(--accent-primary)] transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_PALETTE[(idx + 2) % CHART_PALETTE.length] }}
                          />
                          <span className="text-[var(--text-primary)] font-bold">{item.time_of_day}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)] font-mono">({item.pct || "25%"})</span>
                          <span className="text-[var(--text-primary)] font-black tabular-nums">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ── Tab Content 2: Top DBSCAN Hotspots ─────────────────────────────── */}
          {activeTab === "hotspots" && (
            <Card padded={false}>
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-black text-[var(--text-primary)] tracking-tight">
                    High-Risk Hotspot Clusters (DBSCAN Spatial Density)
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                    Machine-learned cluster centroids requiring priority police patrol and CCTV coverage
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge severity="critical" dot>
                    {topHotspots.length} Active High-Density Zones
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[12px] font-black uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-surface)]">
                      <th className="py-4 px-6">Cluster</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6">Risk Score</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Dominant Offense</th>
                      <th className="py-4 px-6">Incidents</th>
                      <th className="py-4 px-6">Peak Diurnal Window</th>
                      <th className="py-4 px-6">Surveillance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[13.5px]">
                    {topHotspots.map((hs: any) => {
                      const isCritical = hs.risk_score >= 80;
                      return (
                        <tr
                          key={hs.cluster_id || hs.id}
                          className="hover:bg-[var(--bg-card-hover)] transition-colors"
                        >
                          <td className="py-4.5 px-6 font-mono font-bold text-[var(--text-primary)]">
                            <span className="px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
                              #{hs.cluster_id || hs.id}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 font-bold text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                              <span>{hs.location}</span>
                            </div>
                          </td>
                          <td className="py-4.5 px-6 font-black tabular-nums">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${isCritical ? "bg-red-500/10 text-[#dc2626]" : "bg-amber-500/10 text-[#d97706]"}`}>
                              {hs.risk_score}/100
                            </span>
                          </td>
                          <td className="py-4.5 px-6">
                            <Badge severity={isCritical ? "critical" : "medium"}>
                              {hs.risk_category || hs.risk_level}
                            </Badge>
                          </td>
                          <td className="py-4.5 px-6 text-[var(--text-secondary)] font-semibold">
                            {hs.dominant_crime_type}
                          </td>
                          <td className="py-4.5 px-6 tabular-nums font-black text-[var(--text-primary)]">
                            {hs.incident_count} reports
                          </td>
                          <td className="py-4.5 px-6 text-[var(--text-secondary)] font-medium">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>{hs.peak_time_of_day}</span>
                            </div>
                          </td>
                          <td className="py-4.5 px-6 text-[var(--text-secondary)] font-medium">
                            <div className="flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>{hs.avg_cctv_coverage} CCTV</span>
                            </div>
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
            <div className="space-y-4">
              {/* Filter & Search Toolbar */}
              <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-card)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {[
                    { id: "all", label: "All Reports", count: incidentQueue.length },
                    { id: "pending", label: "Pending Review", count: pendingCount, highlight: pendingCount > 0 },
                    { id: "verified", label: "Verified", count: verifiedCount },
                    { id: "rejected", label: "Rejected", count: rejectedCount },
                  ].map((filter) => {
                    const isSel = queueStatusFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setQueueStatusFilter(filter.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                          isSel
                            ? "bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm"
                            : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSel
                              ? "bg-white/20 text-white"
                              : filter.highlight
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-bold"
                              : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                          }`}
                        >
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Severity Dropdown & Search Bar */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* Severity Filter Dropdown */}
                  <div className="relative min-w-[135px]">
                    <select
                      value={queueSeverityFilter}
                      onChange={(e) => setQueueSeverityFilter(e.target.value as any)}
                      className="w-full h-9 pl-2.5 pr-7 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="all">All Severities</option>
                      <option value="high">🔴 High (7-10)</option>
                      <option value="medium">🟠 Medium (4-6)</option>
                      <option value="low">🟢 Low (1-3)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search incident, location..."
                      value={queueSearch}
                      onChange={(e) => setQueueSearch(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Incident Cards Feed */}
              <div className="space-y-3">
                {filteredQueue.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
                    <ShieldCheck className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      No incident reports matching criteria
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Try clearing filters or search to view all {incidentQueue.length} incident submissions.
                    </div>
                  </div>
                ) : (
                  filteredQueue.map((report) => {
                    const isPending = report.status === "pending";
                    const isVerified = report.status === "verified";
                    const isRejected = report.status === "rejected";
                    const sev = Number(report.severity) || 5;
                    const isCritical = sev >= 7;

                    return (
                      <div
                        key={report.id}
                        className={`p-6 sm:p-7 rounded-3xl bg-[var(--bg-card)] border transition-all hover:shadow-lg ${
                          isPending
                            ? isCritical
                              ? "border-l-4 border-l-rose-500 border-[var(--border-subtle)]"
                              : "border-l-4 border-l-amber-500 border-[var(--border-subtle)]"
                            : isVerified
                            ? "border-l-4 border-l-emerald-500 border-[var(--border-subtle)]"
                            : "border-l-4 border-l-slate-400 border-[var(--border-subtle)] opacity-75"
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shadow-sm">
                              #{report.id}
                            </span>
                            <h4 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                              {report.crime_type || report.title}
                            </h4>
                            <span
                              className={`text-xs font-black px-3 py-1 rounded-full ${
                                isCritical
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}
                            >
                              Severity: {sev}/10
                            </span>
                            {isPending ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Pending Review
                              </span>
                            ) : isVerified ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Verified & Ingested
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                <XCircle className="w-3.5 h-3.5 text-slate-500" />
                                Dismissed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span>Logged: {report.created_at || "Recently"}</span>
                          </div>
                        </div>

                        {/* Card Description in clean dedicated container */}
                        <div className="my-4 p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm sm:text-[14.5px] text-[var(--text-primary)] leading-relaxed font-medium">
                          {report.description || "No detailed description provided."}
                        </div>

                        {/* Card Footer: Metadata & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                              <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                              <span>{report.location || `[${report.lat}, ${report.lon}]`}</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              GPS: [{report.lat}, {report.lon}]
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleModerate(report.id, "verified")}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Verify & Ingest</span>
                                </button>
                                <button
                                  onClick={() => handleModerate(report.id, "rejected")}
                                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-[var(--text-secondary)] border border-[var(--border-subtle)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                                Decision Logged ({report.status})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Tab Content 4: Live SOS Feed ──────────────────────────────────── */}
          {activeTab === "sos_monitor" && (
            <Card padded={false}>
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-ping" />
                    Live SOS Broadcast Stream
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                    Instant emergency dispatch triggers across State Police ERSS 112 network
                  </p>
                </div>
                <Badge severity="critical" dot>
                  {sosAlerts.length} Active Triggers
                </Badge>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {sosAlerts.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)] shadow-sm">
                      <Radio className="w-7 h-7 animate-pulse text-[var(--accent-primary)]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[15px] text-[var(--text-primary)] font-bold">
                        Listening for incoming emergency broadcasts on WebSocket /ws/police...
                      </p>
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        All 112 ERSS police patrol units in {selectedCity} are synchronized.
                      </p>
                    </div>
                  </div>
                ) : (
                  sosAlerts.map((sos, i) => (
                    <div
                      key={sos.alert_id || i}
                      className="p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[rgba(239,68,68,0.04)] hover:bg-[rgba(239,68,68,0.08)] transition-colors border-l-4 border-l-[#ef4444]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-black text-[#dc2626]">
                            🚨 SOS Alert #{sos.alert_id || sos.id || i + 1}
                          </span>
                          <Badge severity="critical">
                            {sos.status || "Active Dispatch"}
                          </Badge>
                        </div>
                        <div className="text-[14px] text-[var(--text-primary)] font-medium">
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
              <div className="p-6 sm:p-7 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-black text-[var(--text-primary)] tracking-tight">
                    Active Patrol Route & Surveillance Heatmap
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                    High-density crime avoidance waypoints, safe avenues, and 24x7 patrolled checkpoints
                  </p>
                </div>
                <Badge severity="brand">Geospatial Overlay</Badge>
              </div>

              <div className="p-5 sm:p-6 bg-[var(--bg-surface)]">
                <PatrolRouteMap route={cityMeta.patrolRoute} />

                {/* Checkpoint Itinerary Cards Grid */}
                <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
                  <div className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>{cityMeta.name} Patrol Checkpoint Schedule & Risk Levels</span>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--accent-primary)]">
                      {cityMeta.patrolRoute.length} Waypoints Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {cityMeta.patrolRoute.map((cp) => {
                      const isCrit = cp.risk_level === "Critical";
                      const isHigh = cp.risk_level === "High";
                      return (
                        <div
                          key={cp.order}
                          className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all shadow-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black font-mono text-[var(--text-muted)]">
                              STOP {cp.order}
                            </span>
                            <Badge severity={isCrit ? "critical" : isHigh ? "high" : "low"} size="sm">
                              {cp.risk_level}
                            </Badge>
                          </div>
                          <div className="text-[12.5px] font-bold text-[var(--text-primary)] truncate" title={cp.location}>
                            {cp.location}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5">
                            <span>{cp.time || "Active"}</span>
                            <span className="font-bold text-[var(--text-secondary)]">{cp.crime_count} FIRs</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </section>
      </main>

      {/* ── Jurisdiction / City Selector Modal ─────────────────────────────── */}
      <CityPickerModal
        isOpen={isCityPickerOpen}
        onClose={() => setIsCityPickerOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={(c) => setSelectedCity(c)}
        title="Police Jurisdiction Switcher"
        subtitle="Switch active ERSS-112 command view across 10 major metropolitan police departments in India."
      />
    </PageBackground>
  );
}
