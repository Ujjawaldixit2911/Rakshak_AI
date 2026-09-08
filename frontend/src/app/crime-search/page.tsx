"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { api, type CrimeSearchResult, type Area } from "@/lib/api";
import SafetyScoreGauge from "@/components/public/SafetyScoreGauge";
import CrimeTypeChart from "@/components/public/CrimeTypeChart";
import PeakHoursChart from "@/components/public/PeakHoursChart";
import HotspotCard from "@/components/public/HotspotCard";
import ForecastChart from "@/components/public/ForecastChart";
import WeeklyPatternGrid from "@/components/public/WeeklyPatternGrid";
import AIInsightsPanel from "@/components/public/AIInsightsPanel";
import SafetyRecommendations from "@/components/public/SafetyRecommendations";

const CrimeHeatmap = dynamic(() => import("@/components/public/CrimeHeatmap"), {
  ssr: false,
  loading: () => <div style={{ height: 380, borderRadius: 12, background: "var(--color-bg-card)" }} className="skeleton" />,
});

const QUICK_AREAS = [
  "Hazratganj", "Gomti Nagar", "Charbagh", "Aminabad",
  "Alambagh", "Indira Nagar", "Hussainganj", "Mahanagar",
];

function PanelTitle({ icon, title, badge }: { icon: string; title: string; badge?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <span className="panel-title">{title}</span>
      </div>
      {badge}
    </div>
  );
}

function SkeletonCard({ h = 200 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h, borderRadius: 14 }} />;
}

export default function CrimeSearchPage() {
  const [query, setQuery] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [suggestions, setSuggestions] = useState<Area[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CrimeSearchResult | null>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAreas().then(r => setAreas(r.areas)).catch(console.error);
  }, []);

  const filterSuggestions = useCallback((q: string) => {
    if (!q) return setSuggestions([]);
    setSuggestions(areas.filter(a => a.name.toLowerCase().includes(q.toLowerCase())));
  }, [areas]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    filterSuggestions(e.target.value);
    setShowSuggestions(true);
  };

  const doSearch = async (areaName: string) => {
    if (!areaName) return;
    setLoading(true);
    setError("");
    setResult(null);
    setSelectedArea(areaName);
    setQuery(areaName);
    setShowSuggestions(false);
    try {
      const data = await api.crimeSearch(areaName);
      setResult(data);
    } catch (e) {
      setError("Could not load data. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch(query);
  };

  const { score, classification, color } = result?.safety_score || {};

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

      {/* ── Hero Search ────────────────────────────────────────────────────── */}
      <div className="fade-in-up" style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Search any area in{" "}
          <span style={{ background: "linear-gradient(135deg, #4f7cff, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Lucknow
          </span>
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", marginBottom: "1.75rem" }}>
          AI-powered crime analytics · Safety scores · Hotspot detection · 7-day forecast
        </p>

        {/* Search bar */}
        <div style={{ position: "relative", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: "1rem", pointerEvents: "none" }}>🔍</span>
              <input
                ref={inputRef}
                id="area-search-input"
                className="input-dark"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Search area... e.g. Gomti Nagar, Hazratganj"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {/* Autocomplete */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "110%", left: 0, right: 0, zIndex: 50,
                  background: "var(--color-bg-card)", border: "1px solid var(--color-border-bright)",
                  borderRadius: 10, boxShadow: "var(--shadow-card)", overflow: "hidden",
                }}>
                  {suggestions.map(a => (
                    <button key={a.name} onMouseDown={() => doSearch(a.name)} style={{
                      width: "100%", padding: "10px 16px", textAlign: "left",
                      background: "none", border: "none", color: "var(--color-text-primary)",
                      fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-card-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ fontSize: "0.75rem" }}>📍</span> {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button id="crime-search-btn" className="btn-primary" onClick={() => doSearch(query)} disabled={loading}>
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {/* Quick area pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
          {QUICK_AREAS.map(a => (
            <button key={a} onClick={() => doSearch(a)} style={{
              padding: "5px 14px", borderRadius: 99,
              background: selectedArea === a ? "var(--color-brand-dim)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${selectedArea === a ? "rgba(79,124,255,0.4)" : "rgba(255,255,255,0.09)"}`,
              color: selectedArea === a ? "#93c5fd" : "var(--color-text-secondary)",
              fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
            }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", marginBottom: "1.5rem" }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <SkeletonCard h={120} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
            <SkeletonCard h={200} />
            <SkeletonCard h={200} />
            <SkeletonCard h={200} />
          </div>
          <SkeletonCard h={380} />
        </div>
      )}

      {/* ── Results Dashboard ──────────────────────────────────────────────── */}
      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ─ Header strip ─ */}
          <div className="card fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "1.25rem 1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Crime Analysis for</div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.01em" }}>{result.area}</h2>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <StatCard label="Total Incidents" value={result.safety_score.total_crimes} icon="📋" />
              <StatCard label="Top Crime" value={result.crime_breakdown[0]?.category || "—"} icon="⚡" />
              <StatCard label="Peak Window" value={result.peak_hours.peak_window} icon="🕐" />
              <StatCard label="Hotspots" value={result.hotspots.length} icon="📍" />
            </div>
          </div>

          {/* ─ Safety Score + Crime Breakdown + Peak Hours ─ */}
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem" }}>
            <div className="card fade-in-up-delay-1">
              <PanelTitle icon="🛡️" title="Safety Score" />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <SafetyScoreGauge data={result.safety_score} size={180} />
              </div>
            </div>
            <div className="card fade-in-up-delay-1">
              <PanelTitle icon="📊" title="Crime Type Breakdown" />
              <CrimeTypeChart data={result.crime_breakdown} />
            </div>
          </div>

          {/* ─ Peak Hours ─ */}
          <div className="card fade-in-up-delay-2">
            <PanelTitle icon="🕐" title="Peak Crime Hours" />
            <PeakHoursChart data={result.peak_hours} />
          </div>

          {/* ─ Heatmap ─ */}
          <div className="card fade-in-up-delay-2">
            <PanelTitle
              icon="🗺️"
              title="Crime Heatmap"
              badge={<span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{result.heatmap.length} data points</span>}
            />
            <CrimeHeatmap
              center={[result.area_meta.lat, result.area_meta.lng]}
              heatmap={result.heatmap}
              hotspots={result.hotspots}
            />
          </div>

          {/* ─ Hotspots ─ */}
          {result.hotspots.length > 0 && (
            <div className="card">
              <PanelTitle
                icon="📍"
                title="Crime Hotspots"
                badge={<span className="badge badge-critical">{result.hotspots.length} clusters detected</span>}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {result.hotspots.map((h, i) => <HotspotCard key={h.id} hotspot={h} index={i} />)}
              </div>
            </div>
          )}

          {/* ─ AI Insights ─ */}
          <div className="card">
            <PanelTitle icon="🧠" title="AI / ML Insights" badge={<span className="badge badge-ai">AI-Generated</span>} />
            <AIInsightsPanel
              spike={result.spike_prediction}
              anomalies={result.anomalies}
              patterns={result.temporal_patterns}
            />
          </div>

          {/* ─ 7-Day Forecast ─ */}
          <div className="card">
            <PanelTitle
              icon="📈"
              title="7-Day Crime Forecast"
              badge={<span className="chip-confidence">🧠 LSTM Neural Network</span>}
            />
            <ForecastChart data={result.forecast} />
          </div>

          {/* ─ Weekly Pattern ─ */}
          <div className="card">
            <PanelTitle
              icon="📅"
              title="Weekly Crime Pattern"
              badge={<span className="chip-confidence">🌲 Random Forest</span>}
            />
            <WeeklyPatternGrid data={result.weekly_pattern} />
          </div>

          {/* ─ Safety Recommendations ─ */}
          <div className="card">
            <PanelTitle icon="✅" title="AI Safety Recommendations" />
            <SafetyRecommendations recommendations={result.recommendations} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: "1rem" }}>Search for a Lucknow area above to view the full crime analytics dashboard.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
    </div>
  );
}
