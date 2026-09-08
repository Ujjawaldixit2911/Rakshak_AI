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

  // ── AI Assistant & Whisper APIs ──────────────────────────────────────────
  assistantChat: (message: string, city: string = "Delhi", history: any[] = []) =>
    fetchJSON<{
      response: string;
      action?: string | null;
      action_data?: any;
      engine?: string;
    }>("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, city, history }),
    }),

  transcribeAudio: async (audioBlob: Blob): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech.webm");
    const res = await fetch(`${API_BASE_URL}/api/assistant/transcribe`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Transcription error ${res.status}`);
    return res.json();
  },

  getRouteGuidance: (
    city: string,
    coordinates: [number, number][],
    origin_name: string,
    dest_name: string,
    mode: string = "safest"
  ) =>
    fetchJSON<{
      city: string;
      mode: string;
      total_distance_steps: number;
      steps: Array<{
        step_index: number;
        lat: number;
        lon: number;
        title: string;
        guidance: string;
        safety_rating: string;
        action_prompt: string;
      }>;
      overall_summary: string;
    }>("/api/assistant/route-guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        coordinates,
        origin_name,
        dest_name,
        mode,
      }),
    }),

  // ── Agentic Supervisor API (Part 3) ───────────────────────────────────────
  agentChat: (
    message: string,
    city: string = "Delhi",
    history: any[] = [],
    admin_mode: boolean = false,
    confirmed_action: any = null
  ) =>
    fetchJSON<{
      response: string;
      action?: string | null;
      action_data?: any;
      tool_audit_log?: Array<{ tool: string; status: string; args: any }>;
      data_confidence?: string;
    }>("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, city, history, admin_mode, confirmed_action }),
    }),

  getPreJourneyBriefing: (
    origin_name: string,
    dest_name: string,
    city: string = "Delhi",
    time_of_day: string = "Night",
    mode: string = "safest"
  ) =>
    fetchJSON<any>("/api/agent/pre-journey-briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin_name, dest_name, city, time_of_day, mode }),
    }),

  // ── Part 4 Advanced Safety Modules APIs ──────────────────────────────────
  getRakshakScore: (lat: number, lon: number, city: string = "Delhi", time_of_day: string = "Evening", mode: string = "women_safety") =>
    fetchJSON<{
      rakshak_safety_score: number;
      classification: string;
      color: string;
      one_line_explanation: string;
      data_confidence: string;
      factors: any;
      disclaimer: string;
    }>(`/api/safety/rakshak-score?lat=${lat}&lon=${lon}&city=${city}&time_of_day=${time_of_day}&mode=${mode}`),

  runWhatIfSimulation: (payload: { origin: string; destination: string; city: string; times?: string[]; modes?: string[] }) =>
    fetchJSON<{
      origin: string;
      destination: string;
      city: string;
      scenarios: Array<{
        time_of_day: string;
        mode: string;
        rakshak_safety_score: number;
        travel_time_minutes: number;
        distance_km: number;
        risk_exposure: string;
        recommendation: string;
      }>;
      summary: string;
    }>("/api/safety/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getLastMileAnalysis: (payload: { origin: string; destination: string; city: string; time_of_day?: string }) =>
    fetchJSON<{
      route_title: string;
      overall_route_safety_score: number;
      segments: Array<{
        segment_name: string;
        type: string;
        distance_approx: string;
        rakshak_safety_score: number;
        classification: string;
        lighting_index: string;
        safety_tip: string;
      }>;
      last_mile_critical_alert: boolean;
      last_mile_advice: string;
    }>("/api/safety/last-mile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  runNLCrimeSearch: (q: string, city: string = "Delhi") =>
    fetchJSON<{
      parsed_filters: { crime_type: string; location: string; time_of_day: string; city: string };
      total_results: number;
      data_confidence: string;
      incidents: Array<{ id: number; crime_type: string; location_name: string; severity: number; time_of_day: string; date: string }>;
    }>(`/api/safety/nl-search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`),

  startFamilyMode: (payload: { origin: string; destination: string; city: string; eta_minutes?: number }) =>
    fetchJSON<{
      trip_id: string;
      share_url: string;
      status: string;
      origin: string;
      destination: string;
      eta_minutes: number;
      departure_time: string;
      geofence_status: string;
      battery_saver_available: boolean;
      trusted_contacts_alerted: string[];
      message: string;
    }>("/api/safety/family-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  // ── Layer 7 Platform & Journey Lifecycle APIs ────────────────────────────────
  getPlatformHealth: () => fetchJSON<{
    status: string;
    timestamp: string;
    components: Record<string, { status: string; records_indexed?: number; formula?: string; provider?: string; quality_score?: string; permission_gating?: string }>;
    system_metrics: { uptime_pct: number; avg_latency_ms: number; cache_hit_rate: string; active_permission_tier: number };
  }>("/api/platform/health"),

  getDataQualityReport: () => fetchJSON<{
    dataset_version: string;
    last_ingestion_date: string;
    total_records: number;
    valid_coordinates: number;
    missing_coordinates: number;
    quality_index_pct: number;
    sources: Array<{ source_name: string; records: number; verified: boolean }>;
    coverage_jurisdiction: string[];
  }>("/api/platform/data-quality"),

  createJourney: (payload: {
    start_lat: number;
    start_lon: number;
    dest_lat: number;
    dest_lon: number;
    start_name?: string;
    dest_name?: string;
    route_type?: string;
    selected_route?: any;
    safety_briefing?: any;
    user_id?: number;
  }) =>
    fetchJSON<{
      status: string;
      journey_uuid: string;
      journey_status: string;
      start_name: string;
      dest_name: string;
      created_at: string;
    }>("/api/platform/journey/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  startJourney: (journey_uuid: string) =>
    fetchJSON<{
      status: string;
      journey_uuid: string;
      start_time: string;
      expected_arrival: string;
    }>(`/api/platform/journey/${journey_uuid}/start`, {
      method: "POST",
    }),

  sendJourneyTelemetry: (
    journey_uuid: string,
    payload: { current_lat: number; current_lon: number; deviation_threshold_km?: number }
  ) =>
    fetchJSON<{
      journey_uuid: string;
      status: string;
      current_lat: number;
      current_lon: number;
      dist_to_route_km: number;
      is_deviated: boolean;
      deviations_count: number;
      current_risk: number;
      risk_level: string;
      recent_alert?: any;
    }>(`/api/platform/journey/${journey_uuid}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  completeJourney: (journey_uuid: string) =>
    fetchJSON<{
      journey_uuid: string;
      start_name: string;
      dest_name: string;
      route_type: string;
      duration_min: number;
      distance_km: number;
      avg_risk_score: number;
      safety_rating: string;
      deviations_count: number;
      route_adherence_pct: string;
      alerts_resolved: number;
      completed_at: string;
      disclaimer: string;
    }>(`/api/platform/journey/${journey_uuid}/complete`, {
      method: "POST",
    }),

  getJourneyStatus: (journey_uuid: string) =>
    fetchJSON<any>(`/api/platform/journey/${journey_uuid}`),

  transitionPoliceCase: (
    case_id: number,
    payload: { changed_by?: string; role?: string; new_status: string; action_note?: string; evidence_urls?: string[] }
  ) =>
    fetchJSON<{
      status: string;
      case_id: number;
      old_status: string;
      new_status: string;
      note: string;
    }>(`/api/platform/police/case/${case_id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getPoliceCaseAudit: (case_id: number) =>
    fetchJSON<Array<{
      id: number;
      changed_by: string;
      role: string;
      old_status: string;
      new_status: string;
      action_note: string;
      evidence_urls: string[];
      timestamp: string;
    }>>(`/api/platform/police/case/${case_id}/audit`),

  getSystemConfigs: () =>
    fetchJSON<Record<string, any>>("/api/platform/configs"),
};
