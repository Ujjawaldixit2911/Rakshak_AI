export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://rakshak-ai-backend-ndgm.onrender.com"
).replace(/\/$/, "");

export const WS_BASE_URL = API_BASE_URL.startsWith("https://")
  ? API_BASE_URL.replace(/^https:\/\//, "wss://")
  : API_BASE_URL.startsWith("http://")
  ? API_BASE_URL.replace(/^http:\/\//, "ws://")
  : `ws://${API_BASE_URL}`;

const BASE = API_BASE_URL;

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("rakshak_police_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Public APIs ───────────────────────────────────────────────────────────────

export interface Area { name: string; lat: number; lng: number; }
export interface SafetyScore { score: number; classification: string; total_crimes: number; color: string; }
export interface CrimeBreakdown { category: string; count: number; percentage: number; }
export interface HourlyData { hour: number; label: string; count: number; intensity: number; }
export interface PeakHours { hourly_data: HourlyData[]; peak_window: string; peak_hour: number; peak_count: number; }
export interface Hotspot { id: number; location: string; lat: number; lng: number; crime_count: number; intensity: number; risk_level: string; color: string; top_crime_types: string[]; }
export interface HeatmapPoint { lat: number; lng: number; intensity: number; }
export interface ForecastPoint { date: string; incidents: number; conf_low?: number; conf_high?: number; type: "historical" | "forecast"; }
export interface ForecastMetrics { rmse: number; r2: number; mae: number; }
export interface LSTMForecast { historical: ForecastPoint[]; forecast: ForecastPoint[]; metrics: ForecastMetrics; model: string; confidence: number; }
export interface WeeklyDay { day: string; risk_level: string; color: string; confidence: number; }
export interface WeeklyPattern { weekly_pattern: WeeklyDay[]; model: string; confidence: number; }
export interface Anomaly { date: string; crime_count: number; avg_severity: number; anomaly_type: string; top_crime_type: string; }
export interface AnomalyResult { anomalies: Anomaly[]; model: string; confidence: number; total_anomalous_days: number; }
export interface SpikePrediction { spike_predicted: boolean; message: string; detail: string; confidence: number; recent_7_days: number; prior_7_days: number; trend_ratio: number; model: string; }
export interface TemporalPattern { day: string; time_window: string; incident_count: number; pattern: string; confidence: number; }
export interface Recommendation { icon: string; tip: string; priority: string; }

export interface CrimeSearchResult {
  area: string;
  area_meta: { lat: number; lng: number };
  safety_score: SafetyScore;
  crime_breakdown: CrimeBreakdown[];
  peak_hours: PeakHours;
  hotspots: Hotspot[];
  heatmap: HeatmapPoint[];
  forecast: LSTMForecast;
  weekly_pattern: WeeklyPattern;
  anomalies: AnomalyResult;
  spike_prediction: SpikePrediction;
  temporal_patterns: TemporalPattern[];
  recommendations: Recommendation[];
}

export const api = {
  getAreas: () => fetchJSON<{ areas: Area[] }>("/api/areas"),

  crimeSearch: (area: string) =>
    fetchJSON<CrimeSearchResult>(`/api/crime-search?area=${encodeURIComponent(area)}`),

  getSafetyScore: (area: string) =>
    fetchJSON<SafetyScore>(`/api/safety-score/${encodeURIComponent(area)}`),

  getHotspots: (area: string) =>
    fetchJSON<{ hotspots: Hotspot[] }>(`/api/hotspots/${encodeURIComponent(area)}`),

  getHeatmap: () => fetchJSON<{ heatmap: HeatmapPoint[] }>("/api/heatmap"),

  getForecast: (area: string) =>
    fetchJSON<{ lstm: LSTMForecast; random_forest: WeeklyPattern }>(`/api/forecast/${encodeURIComponent(area)}`),

  getInsights: (area: string) =>
    fetchJSON<{ spike_prediction: SpikePrediction; anomalies: AnomalyResult; temporal_patterns: TemporalPattern[]; recommendations: Recommendation[] }>(`/api/insights/${encodeURIComponent(area)}`),

  // ── Police APIs ─────────────────────────────────────────────────────────────
  policeLogin: (officer_id: string, pin: string) =>
    fetchJSON<{ token: string; officer_id: string; role: string; message: string }>("/api/police/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officer_id, pin }),
    }),

  policeDashboard: () =>
    fetchJSON<any>("/api/police/dashboard", { headers: authHeaders() }),

  resourceAllocation: () =>
    fetchJSON<any>("/api/police/resource-allocation", { headers: authHeaders() }),

  patrolRoutes: () =>
    fetchJSON<any>("/api/police/patrol-routes", { headers: authHeaders() }),

  deploymentSchedule: () =>
    fetchJSON<any>("/api/police/deployment-schedule", { headers: authHeaders() }),
};
