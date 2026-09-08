"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { API_BASE_URL, WS_BASE_URL } from "@/lib/api";

type Tab = "analytics" | "moderation" | "hotspots" | "sos_monitor";

const CHART_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

export default function PoliceCommandDashboard() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Delhi");
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [officerId, setOfficerId] = useState("officer001");

  const [dashData, setDashData] = useState<any | null>(null);
  const [incidentQueue, setIncidentQueue] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("rakshak_police_token");
    if (!token) {
      router.push("/police/login");
      return;
    }
    setOfficerId(localStorage.getItem("rakshak_police_id") || "officer001");
  }, []);

  // Fetch Dashboard Stats & Queue for City
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [dashRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/police/dashboard?city=${selectedCity}`),
        fetch(`${API_BASE_URL}/api/police/incident-queue?city=${selectedCity}`),
      ]);
      const d = await dashRes.json();
      const q = await queueRes.json();
      setDashData(d);
      setIncidentQueue(q.reports || []);
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
    const socket = new WebSocket(`${WS_BASE_URL}/ws/police`);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to Police Live Alert WebSocket Hub.");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "EMERGENCY_SOS_TRIGGERED" || payload.status === "Active Dispatch Alert") {
          setSosAlerts((prev) => [payload, ...prev]);
          setActionMessage(`🚨 LIVE SOS INCOMING: Alert #${payload.alert_id || payload.id} at [${payload.lat}, ${payload.lon}]`);
        }
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    socket.onclose = () => {
      console.log("Disconnected from Police Live Alert WebSocket.");
    };

    return () => {
      socket.close();
    };
  }, []);

  // Moderate Incident Action
  const handleModerate = async (incidentId: number, status: "verified" | "rejected") => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/police/incidents/${incidentId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setIncidentQueue((prev) =>
          prev.map((item) => (item.id === incidentId ? { ...item, status } : item))
        );
        setActionMessage(`Incident #${incidentId} marked as '${status}'.`);
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

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "1.5rem" }}>
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        gap: 12
      }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            Police & Commander Intelligence Portal
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900 }}>
            🚔 Police Command Dashboard · <span style={{ color: "#4f7cff" }}>{selectedCity}</span>
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* City Selector */}
          <div style={{ display: "flex", background: "rgba(30, 41, 59, 0.8)", padding: "4px", borderRadius: "8px" }}>
            {["Delhi", "Mumbai"].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCity(c)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  background: selectedCity === c ? "#4f7cff" : "transparent",
                  color: selectedCity === c ? "#fff" : "#94a3b8",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            fontSize: "0.8rem",
            color: "#4ade80",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Officer: {officerId}
          </div>

          <button className="btn-outline" onClick={handleLogout} style={{ fontSize: "0.82rem" }}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Live Alert Banner ────────────────────────────────────────────────── */}
      {actionMessage && (
        <div style={{
          marginBottom: "1rem",
          padding: "10px 16px",
          borderRadius: "10px",
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          color: "#fca5a5",
          fontSize: "0.85rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── Tab Navigation ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        gap: 6,
        marginBottom: "1.5rem",
        background: "var(--color-bg-card)",
        padding: 4,
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        width: "fit-content"
      }}>
        {[
          { id: "analytics", label: "Crime Analytics", icon: "📊" },
          { id: "hotspots", label: "Hotspot Zones", icon: "🔥" },
          { id: "moderation", label: `Moderation Queue (${incidentQueue.filter(i => i.status === 'pending').length})`, icon: "🛡️" },
          { id: "sos_monitor", label: `Live SOS Feed (${sosAlerts.length})`, icon: "🚨" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTab === t.id ? "var(--color-brand)" : "transparent",
              color: activeTab === t.id ? "#fff" : "var(--color-text-secondary)",
              transition: "all 0.2s"
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Crime Analytics Overview ─────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* KPI Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Total Crimes Logged</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>
                {summary.total_crimes_recorded?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>{selectedCity} historical data</div>
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Resolution Rate</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", marginTop: 4 }}>
                {summary.resolution_rate_percent}%
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>{summary.resolved_crimes} resolved cases</div>
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Suspects Arrested</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
                {summary.suspects_arrested || 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>Custody confirmed</div>
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Avg Police Response</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b", marginTop: 4 }}>
                {summary.avg_police_response_time_minutes} min
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>Dispatch to scene</div>
            </div>

            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Active Hotspots</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ef4444", marginTop: 4 }}>
                {summary.active_hotspot_clusters || 0}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>DBSCAN clusters</div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
            {/* Crime by Type Bar Chart */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "1rem" }}>
                Incident Volume by Crime Category
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={crimeByType} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={45} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }} />
                  <Bar dataKey="count" name="Incidents" radius={[4, 4, 0, 0]}>
                    {crimeByType.map((item: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Crime by Time of Day Pie Chart */}
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "1rem" }}>
                Temporal Distribution (Time of Day)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={crimeByTod}
                    dataKey="count"
                    nameKey="time_of_day"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {crimeByTod.map((item: any, index: number) => (
                      <Cell key={`pie-cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }} />
                  <Legend formatter={(val: any) => <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>{val}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Top Hotspots Priority Table ──────────────────────────────── */}
      {activeTab === "hotspots" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>
            🔥 Top DBSCAN High-Risk Hotspot Clusters ({selectedCity})
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: "0.75rem" }}>
                  <th style={{ padding: "10px" }}>Cluster ID</th>
                  <th style={{ padding: "10px" }}>Risk Score</th>
                  <th style={{ padding: "10px" }}>Risk Category</th>
                  <th style={{ padding: "10px" }}>Dominant Crime</th>
                  <th style={{ padding: "10px" }}>Incidents</th>
                  <th style={{ padding: "10px" }}>Avg Severity</th>
                  <th style={{ padding: "10px" }}>Peak Time</th>
                  <th style={{ padding: "10px" }}>CCTV Coverage</th>
                </tr>
              </thead>
              <tbody>
                {topHotspots.map((hs: any) => (
                  <tr key={hs.cluster_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.85rem" }}>
                    <td style={{ padding: "10px", fontWeight: 700 }}>#{hs.cluster_id}</td>
                    <td style={{ padding: "10px", fontWeight: 800, color: hs.risk_score >= 65 ? "#ef4444" : "#f59e0b" }}>
                      {hs.risk_score}/100
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span className={`badge badge-${hs.risk_score >= 65 ? "critical" : "moderate"}`}>
                        {hs.risk_category}
                      </span>
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{hs.dominant_crime_type}</td>
                    <td style={{ padding: "10px" }}>{hs.incident_count}</td>
                    <td style={{ padding: "10px" }}>{hs.avg_severity} / 10</td>
                    <td style={{ padding: "10px" }}>{hs.peak_time_of_day}</td>
                    <td style={{ padding: "10px" }}>{hs.avg_cctv_coverage} cameras</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 3: Incident Report Moderation Queue ─────────────────────────── */}
      {activeTab === "moderation" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800 }}>
              🛡️ Citizen & Community Incident Moderation Queue
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {incidentQueue.length} Total Submissions
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {incidentQueue.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No pending incident reports.</div>
            ) : (
              incidentQueue.map((report) => (
                <div
                  key={report.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12
                  }}
                >
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>
                        #{report.id} · {report.crime_type} ({report.location_name})
                      </strong>
                      <span className={`badge badge-${report.status === "verified" ? "safe" : report.status === "rejected" ? "critical" : "moderate"}`}>
                        {report.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: 4, lineHeight: 1.4 }}>
                      {report.description}
                    </p>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                      GPS: [{report.lat}, {report.lon}] · Severity: {report.severity}/10 · Logged: {report.created_at?.slice(0, 19).replace("T", " ")}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {report.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleModerate(report.id, "verified")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "rgba(34, 197, 94, 0.2)",
                            border: "1px solid #22c55e",
                            color: "#4ade80",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          ✓ Verify
                        </button>
                        <button
                          onClick={() => handleModerate(report.id, "rejected")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid #ef4444",
                            color: "#f87171",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        Decision Logged
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Live SOS Feed ─────────────────────────────────────────────── */}
      {activeTab === "sos_monitor" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "1rem" }}>
            🚨 Real-Time Emergency SOS Broadcast Feed
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sosAlerts.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                Waiting for incoming emergency broadcasts on WebSocket /ws/police...
              </div>
            ) : (
              sosAlerts.map((sos, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "1.2rem" }}>🚨</span>
                      <strong style={{ fontSize: "0.95rem", color: "#fca5a5" }}>
                        Emergency SOS Alert #{sos.alert_id || sos.id || i + 1}
                      </strong>
                      <span className="badge badge-critical">{sos.status || "Active Dispatch"}</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#e2e8f0", marginTop: 4 }}>
                      Location: [{sos.lat}, {sos.lon}] · Emergency Type: {sos.emergency_type || "Immediate Alert"}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>
                      Timestamp: {sos.timestamp || new Date().toISOString()}
                    </div>
                  </div>

                  <button
                    onClick={() => alert(`Officer dispatched to GPS: [${sos.lat}, ${sos.lon}]`)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "#ef4444",
                      border: "none",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      cursor: "pointer"
                    }}
                  >
                    🚔 Dispatch Unit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
