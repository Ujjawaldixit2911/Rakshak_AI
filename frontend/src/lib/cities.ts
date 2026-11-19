export interface CityPreset {
  label: string;
  start: [number, number];
  dest: [number, number];
  startName?: string;
  destName?: string;
  distKm?: string;
  dangerBypassCount?: number;
}

export interface CityHotspot {
  cluster_id: number;
  id: number;
  location: string;
  incident_count: number;
  risk_score: number;
  risk_category: "Critical" | "High" | "Moderate" | "Low";
  risk_level: "Critical" | "High" | "Moderate" | "Low";
  dominant_crime_type: string;
  peak_time_of_day: string;
  avg_cctv_coverage: number;
  lat: number;
  lon: number;
  top_crime_types?: string[];
  color?: string;
}

export interface CityPatrolPoint {
  order: number;
  lat: number;
  lng: number;
  location: string;
  crime_count: number;
  risk_level: "Critical" | "High" | "Medium" | "Low";
  time?: string;
}

export interface CityIncidentQueueItem {
  id: number;
  crime_type: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: "pending" | "verified" | "rejected";
  location: string;
  lat: number;
  lon: number;
  created_at: string;
}

export interface CityMetadata {
  id: string;
  name: string;
  shortName: string;
  state: string;
  zone: "North" | "South" | "West" | "East" | "Central";
  center: [number, number];
  zoom: number;
  emergencyCommand: string;
  policeCommissioner: string;
  jurisdictionBadge: string;
  activePatrolUnits: number;
  activeCameras: number;
  safetyScore: number;
  responseMins: number;
  activeIncidents24h: number;
  resolutionRate: number;
  presets: CityPreset[];
  hotspots: CityHotspot[];
  patrolRoute: CityPatrolPoint[];
  crime_by_type: { type: string; name: string; count: number; value: number }[];
  crime_by_time_of_day: { time_of_day: string; name: string; count: number; value: number; pct: string }[];
  incidentQueue: CityIncidentQueueItem[];
}

export const INDIAN_CITIES: CityMetadata[] = [
  // 1. DELHI NCR
  {
    id: "delhi",
    name: "Delhi NCR",
    shortName: "Delhi",
    state: "Delhi NCT",
    zone: "North",
    center: [28.6139, 77.2090],
    zoom: 12,
    emergencyCommand: "Delhi Police HQ • MHA ERSS-112 Central Grid",
    policeCommissioner: "Special CP (Operations & Dial 112)",
    jurisdictionBadge: "Capital Territory Joint Command",
    activePatrolUnits: 142,
    activeCameras: 4820,
    safetyScore: 84,
    responseMins: 4.2,
    activeIncidents24h: 18,
    resolutionRate: 88.5,
    presets: [
      { label: "Connaught Place → Saket", start: [28.6315, 77.2167], dest: [28.5245, 77.2066], startName: "Connaught Place", destName: "Saket Metro Hub", distKm: "14.2 km", dangerBypassCount: 3 },
      { label: "Rohini → Hauz Khas", start: [28.7495, 77.0565], dest: [28.5494, 77.2001], startName: "Rohini Sector 14", destName: "Hauz Khas Village", distKm: "22.5 km", dangerBypassCount: 4 },
      { label: "Dwarka → India Gate", start: [28.5921, 77.0460], dest: [28.6129, 77.2295], startName: "Dwarka Sector 21", destName: "India Gate Boulevard", distKm: "19.8 km", dangerBypassCount: 2 },
      { label: "Karol Bagh → Lajpat Nagar", start: [28.6514, 77.1907], dest: [28.5700, 77.2373], startName: "Karol Bagh Market", destName: "Lajpat Nagar Central", distKm: "13.6 km", dangerBypassCount: 3 },
      { label: "Noida Sec 18 → CP", start: [28.5708, 77.3261], dest: [28.6315, 77.2167], startName: "Noida Sector 18", destName: "Connaught Place", distKm: "15.9 km", dangerBypassCount: 2 },
    ],
    hotspots: [
      { cluster_id: 101, id: 101, location: "Seelampur Market Corridor", incident_count: 84, risk_score: 92, risk_category: "Critical", risk_level: "Critical", dominant_crime_type: "Snatching & Robbery", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 14, lat: 28.6692, lon: 77.2680, top_crime_types: ["Snatching", "Theft"], color: "#ef4444" },
      { cluster_id: 102, id: 102, location: "Kashmere Gate Subways & ISBT", incident_count: 65, risk_score: 84, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Theft", peak_time_of_day: "Evening (18:00 - 21:00)", avg_cctv_coverage: 22, lat: 28.6675, lon: 77.2280, top_crime_types: ["Pickpocketing", "Snatching"], color: "#ef4444" },
      { cluster_id: 103, id: 103, location: "Paharganj Inner Lanes", incident_count: 51, risk_score: 72, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Harassment & Scams", peak_time_of_day: "Night (23:00 - 03:00)", avg_cctv_coverage: 8, lat: 28.6430, lon: 77.2150, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 104, id: 104, location: "Uttam Nagar East Commercial Axis", incident_count: 43, risk_score: 68, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Vehicle Theft", peak_time_of_day: "Afternoon (14:00 - 17:00)", avg_cctv_coverage: 11, lat: 28.6210, lon: 77.0580, top_crime_types: ["Vehicle Theft"], color: "#f59e0b" },
      { cluster_id: 105, id: 105, location: "Saket Metro Corridor & Select Mall", incident_count: 36, risk_score: 61, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Street Harassment", peak_time_of_day: "Evening (19:00 - 22:00)", avg_cctv_coverage: 19, lat: 28.5245, lon: 77.2066, top_crime_types: ["Harassment"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 28.6315, lng: 77.2167, location: "Connaught Place Sector A", crime_count: 14, risk_level: "High", time: "18:00 - 19:30" },
      { order: 2, lat: 28.6506, lng: 77.2334, location: "Chandni Chowk Corridor", crime_count: 8, risk_level: "Medium", time: "19:45 - 21:00" },
      { order: 3, lat: 28.5355, lng: 77.2500, location: "Nehru Place Hub", crime_count: 4, risk_level: "Low", time: "21:15 - 22:30" },
      { order: 4, lat: 28.5672, lng: 77.2100, location: "AIIMS Safe Transit Zone", crime_count: 2, risk_level: "Low", time: "22:45 - 00:00" },
      { order: 5, lat: 28.6289, lng: 77.2065, location: "Pahar Ganj High-Risk Corridor", crime_count: 18, risk_level: "Critical", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 420, value: 420 },
      { type: "Snatching", name: "Snatching", count: 280, value: 280 },
      { type: "Harassment", name: "Harassment", count: 190, value: 190 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 150, value: 150 },
      { type: "Assault & Battery", name: "Assault & Battery", count: 95, value: 95 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 180, value: 180, pct: "10.6%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 310, value: 310, pct: "18.3%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 520, value: 520, pct: "30.8%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 680, value: 680, pct: "40.3%" },
    ],
    incidentQueue: [
      { id: 101, crime_type: "Harassment & Stalking", title: "Harassment & Stalking", description: "Unlit dark stretch behind commercial market with aggressive group blocking pedestrian alleyway.", category: "Harassment", severity: 8, status: "pending", location: "Saket Block D, Metro Gate 2 Corridor", lat: 28.5245, lon: 77.2066, created_at: "10 mins ago" },
      { id: 102, crime_type: "Phone Snatching on Bike", title: "Phone Snatching on Bike", description: "Two suspects on black Pulsar motorcycle snatched phone from commuter walking towards subway entrance.", category: "Snatching", severity: 7, status: "pending", location: "Kashmere Gate Gate 3 Subway", lat: 28.6692, lon: 77.2315, created_at: "25 mins ago" },
      { id: 103, crime_type: "Vehicle Break-In Attempt", title: "Vehicle Break-In Attempt", description: "Parked car with smashed passenger glass on service corridor near district hospital perimeter.", category: "Theft", severity: 6, status: "verified", location: "Rohini Sector 14 Outer Ring Service Road", lat: 28.7041, lon: 77.1025, created_at: "1 hour ago" },
      { id: 104, crime_type: "Municipal Street Light Failure", title: "Municipal Street Light Failure", description: "Entire 600m arterial pedestrian avenue completely pitch black with non-functioning sodium vapor lamps.", category: "Hazard", severity: 5, status: "pending", location: "Connaught Place Outer Circle Block B", lat: 28.6315, lon: 77.2167, created_at: "2 hours ago" },
    ],
  },

  // 2. MUMBAI
  {
    id: "mumbai",
    name: "Mumbai",
    shortName: "Mumbai",
    state: "Maharashtra",
    zone: "West",
    center: [19.0760, 72.8777],
    zoom: 12,
    emergencyCommand: "Mumbai Police Commissionerate • Nirbhaya Command 112",
    policeCommissioner: "Joint CP (Law & Order), Mumbai",
    jurisdictionBadge: "Greater Mumbai Metropolitan Grid",
    activePatrolUnits: 168,
    activeCameras: 6140,
    safetyScore: 89,
    responseMins: 3.9,
    activeIncidents24h: 14,
    resolutionRate: 91.2,
    presets: [
      { label: "Bandra Kurla Complex → Marine Drive", start: [19.0664, 72.8677], dest: [18.9438, 72.8232], startName: "BKC Tech Hub", destName: "Marine Drive Promenade", distKm: "16.8 km", dangerBypassCount: 2 },
      { label: "Andheri West → Juhu Beach", start: [19.1197, 72.8464], dest: [19.1075, 72.8263], startName: "Andheri West Station", destName: "Juhu Beach Boardwalk", distKm: "4.5 km", dangerBypassCount: 1 },
      { label: "Colaba Causeway → Nariman Point", start: [18.9067, 72.8147], dest: [18.9256, 72.8242], startName: "Colaba Market", destName: "Nariman Point Business Dist", distKm: "3.2 km", dangerBypassCount: 1 },
      { label: "Dadar TT Circle → Worli Sea Face", start: [19.0178, 72.8478], dest: [19.0084, 72.8153], startName: "Dadar Central", destName: "Worli Sea Face", distKm: "5.1 km", dangerBypassCount: 2 },
      { label: "Powai Hiranandani → Ghatkopar", start: [19.1176, 72.9060], dest: [19.0860, 72.9080], startName: "Powai Lake", destName: "Ghatkopar Metro Hub", distKm: "6.3 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 201, id: 201, location: "Kurla West Station & Transit Cut", incident_count: 76, risk_score: 88, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Theft", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 18, lat: 19.0650, lon: 72.8790, top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
      { cluster_id: 202, id: 202, location: "Dharavi 90ft Cross Road", incident_count: 59, risk_score: 78, risk_category: "High", risk_level: "High", dominant_crime_type: "Assault & Bag Snatching", peak_time_of_day: "Evening (19:00 - 23:00)", avg_cctv_coverage: 12, lat: 19.0400, lon: 72.8550, top_crime_types: ["Assault", "Theft"], color: "#ef4444" },
      { cluster_id: 203, id: 203, location: "Andheri East Station Skywalk Exit", incident_count: 48, risk_score: 74, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Mob Snatching", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 20, lat: 19.1136, lon: 72.8697, top_crime_types: ["Snatching"], color: "#f59e0b" },
      { cluster_id: 204, id: 204, location: "Govandi Junction Link Road", incident_count: 52, risk_score: 79, risk_category: "High", risk_level: "High", dominant_crime_type: "Two-Wheeler Interception", peak_time_of_day: "Midnight (00:00 - 04:00)", avg_cctv_coverage: 7, lat: 19.0550, lon: 72.9150, top_crime_types: ["Vehicle Theft"], color: "#ef4444" },
      { cluster_id: 205, id: 205, location: "CSMT Subway North Entrance", incident_count: 31, risk_score: 65, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Harassment & Scams", peak_time_of_day: "Evening (18:00 - 21:00)", avg_cctv_coverage: 26, lat: 18.9400, lon: 72.8350, top_crime_types: ["Harassment"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 19.0596, lng: 72.8295, location: "Bandra West Linking Road", crime_count: 9, risk_level: "Medium", time: "18:00 - 19:30" },
      { order: 2, lat: 19.0664, lng: 72.8677, location: "BKC Financial Center", crime_count: 3, risk_level: "Low", time: "19:45 - 21:00" },
      { order: 3, lat: 19.0650, lng: 72.8790, location: "Kurla Junction High-Alert Beat", crime_count: 16, risk_level: "Critical", time: "21:15 - 22:30" },
      { order: 4, lat: 19.0178, lng: 72.8478, location: "Dadar Station Terminus", crime_count: 11, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 18.9438, lng: 72.8232, location: "Marine Drive Boulevard Patrol", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 390, value: 390 },
      { type: "Snatching", name: "Snatching", count: 210, value: 210 },
      { type: "Harassment", name: "Harassment", count: 130, value: 130 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 175, value: 175 },
      { type: "Assault & Battery", name: "Assault & Battery", count: 70, value: 70 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 140, value: 140, pct: "14.4%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 220, value: 220, pct: "22.6%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 340, value: 340, pct: "34.9%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 275, value: 275, pct: "28.1%" },
    ],
    incidentQueue: [
      { id: 201, crime_type: "Local Train Bag Slitting", title: "Local Train Bag Slitting", description: "Commuter reported handbag blade cut during peak crowd disembarkation at Kurla platform 1.", category: "Theft", severity: 6, status: "verified", location: "Kurla West Local Platform 1", lat: 19.0650, lon: 72.8790, created_at: "18 mins ago" },
      { id: 202, crime_type: "Late Night Stalking Alert", title: "Late Night Stalking Alert", description: "Pedestrian reported scooter following along unlit service road towards Bandra Reclamation.", category: "Harassment", severity: 7, status: "pending", location: "Bandra Reclamation Service Slip", lat: 19.0430, lon: 72.8250, created_at: "35 mins ago" },
      { id: 203, crime_type: "Motorcycle Thefts on Service Road", title: "Motorcycle Thefts on Service Road", description: "Two parked bikes lifted within 45 minutes near Andheri metro exit.", category: "Theft", severity: 5, status: "pending", location: "Andheri West Link Rd", lat: 19.1197, lon: 72.8464, created_at: "2 hours ago" },
    ],
  },

  // 3. BENGALURU
  {
    id: "bengaluru",
    name: "Bengaluru",
    shortName: "Bengaluru",
    state: "Karnataka",
    zone: "South",
    center: [12.9716, 77.5946],
    zoom: 12,
    emergencyCommand: "Bengaluru City Police Command Centre • Suraksha-112",
    policeCommissioner: "Additional CP (Traffic & Law/Order)",
    jurisdictionBadge: "Silicon Plateau Cyber-Safe Grid",
    activePatrolUnits: 135,
    activeCameras: 5200,
    safetyScore: 87,
    responseMins: 4.5,
    activeIncidents24h: 16,
    resolutionRate: 89.4,
    presets: [
      { label: "Indiranagar 100ft Rd → Koramangala", start: [12.9784, 77.6408], dest: [12.9352, 77.6245], startName: "Indiranagar 100ft Rd", destName: "Koramangala Sony Jxn", distKm: "6.8 km", dangerBypassCount: 2 },
      { label: "Whitefield ITPL → MG Road", start: [12.9698, 77.7500], dest: [12.9756, 77.6066], startName: "ITPL Main Gate", destName: "MG Road Metro", distKm: "16.4 km", dangerBypassCount: 3 },
      { label: "Electronic City Ph 1 → HSR Layout", start: [12.8399, 77.6770], dest: [12.9121, 77.6446], startName: "Electronic City Toll", destName: "HSR Club Road", distKm: "9.2 km", dangerBypassCount: 1 },
      { label: "Malleshwaram → Hebbal Flyover", start: [13.0031, 77.5643], dest: [13.0358, 77.5970], startName: "Malleshwaram 8th Cross", destName: "Hebbal Lake Ring", distKm: "7.5 km", dangerBypassCount: 2 },
      { label: "Bellandur ORR → Marathahalli", start: [12.9304, 77.6784], dest: [12.9591, 77.6974], startName: "Bellandur Outer Ring", destName: "Marathahalli Bridge", distKm: "5.8 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 301, id: 301, location: "Majestic KSRTC Central Terminus", incident_count: 81, risk_score: 86, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Luggage Theft", peak_time_of_day: "Evening (18:00 - 22:00)", avg_cctv_coverage: 25, lat: 12.9780, lon: 77.5720, top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
      { cluster_id: 302, id: 302, location: "Shivajinagar Bus Stand Alleyways", incident_count: 67, risk_score: 82, risk_category: "High", risk_level: "High", dominant_crime_type: "Snatching & Extortion", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 16, lat: 12.9850, lon: 77.6050, top_crime_types: ["Theft", "Harassment"], color: "#ef4444" },
      { cluster_id: 303, id: 303, location: "Silk Board Junction Underpass", incident_count: 45, risk_score: 74, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Low Illumination & Stalking", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 9, lat: 12.9170, lon: 77.6230, top_crime_types: ["Poor Lighting"], color: "#f59e0b" },
      { cluster_id: 304, id: 304, location: "Marathahalli Bridge Desolate Footpaths", incident_count: 49, risk_score: 76, risk_category: "High", risk_level: "High", dominant_crime_type: "Two-Wheeler Snatching", peak_time_of_day: "Late Night (23:00 - 03:00)", avg_cctv_coverage: 11, lat: 12.9591, lon: 77.6974, top_crime_types: ["Snatching"], color: "#ef4444" },
      { cluster_id: 305, id: 305, location: "Kalasipalya Market Perimeter", incident_count: 38, risk_score: 71, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Commercial Robbery", peak_time_of_day: "Evening (19:00 - 22:00)", avg_cctv_coverage: 14, lat: 12.9620, lon: 77.5780, top_crime_types: ["Theft"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 12.9784, lng: 77.6408, location: "Indiranagar 100ft Road Beat", crime_count: 7, risk_level: "Medium", time: "18:00 - 19:30" },
      { order: 2, lat: 12.9352, lng: 77.6245, location: "Koramangala 80ft Road Safe Beat", crime_count: 4, risk_level: "Low", time: "19:45 - 21:00" },
      { order: 3, lat: 12.9170, lng: 77.6230, location: "Silk Board Traffic & Transit Post", crime_count: 12, risk_level: "High", time: "21:15 - 22:30" },
      { order: 4, lat: 12.9780, lng: 77.5720, location: "Majestic Inter-State Bus Stand", crime_count: 17, risk_level: "Critical", time: "22:45 - 00:00" },
      { order: 5, lat: 12.9756, lng: 77.6066, location: "MG Road Metro Pedestrian Corridor", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 320, value: 320 },
      { type: "Snatching", name: "Snatching", count: 240, value: 240 },
      { type: "Harassment", name: "Harassment", count: 160, value: 160 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 180, value: 180 },
      { type: "Cyber Fraud & Extortion", name: "Cyber Fraud & Extortion", count: 210, value: 210 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 160, value: 160, pct: "14.4%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 290, value: 290, pct: "26.1%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 380, value: 380, pct: "34.2%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 280, value: 280, pct: "25.3%" },
    ],
    incidentQueue: [
      { id: 301, crime_type: "Techie Phone Snatching", title: "Techie Phone Snatching", description: "Biker gang intercepted software engineer near Bellandur footbridge, snatched iPhone.", category: "Snatching", severity: 7, status: "pending", location: "Bellandur Outer Ring Road", lat: 12.9304, lon: 77.6784, created_at: "14 mins ago" },
      { id: 302, crime_type: "Broken Streetlamp Darkzone", title: "Broken Streetlamp Darkzone", description: "Continuous 400m dark stretch near Sony World signal with zero functional municipal lamps.", category: "Hazard", severity: 4, status: "verified", location: "Koramangala 4th Block", lat: 12.9352, lon: 77.6245, created_at: "45 mins ago" },
      { id: 303, crime_type: "Late Night Eve-Teasing Alert", title: "Late Night Eve-Teasing Alert", description: "Female commuter reported repeated harassment near Majestic metro gate 3.", category: "Harassment", severity: 8, status: "pending", location: "Majestic Metro Concourse", lat: 12.9780, lon: 77.5720, created_at: "1 hour ago" },
    ],
  },

  // 4. HYDERABAD
  {
    id: "hyderabad",
    name: "Hyderabad",
    shortName: "Hyderabad",
    state: "Telangana",
    zone: "South",
    center: [17.3850, 78.4867],
    zoom: 12,
    emergencyCommand: "Hyderabad Police Commissionerate • HawkEye 112 Command",
    policeCommissioner: "Commissioner of Police & Cyberabad Joint CP",
    jurisdictionBadge: "Cyberabad & Greater Hyderabad Joint Command",
    activePatrolUnits: 128,
    activeCameras: 4650,
    safetyScore: 88,
    responseMins: 4.1,
    activeIncidents24h: 12,
    resolutionRate: 92.0,
    presets: [
      { label: "Hitec City Cyber Towers → Gachibowli Stadium", start: [17.4504, 78.3808], dest: [17.4435, 78.3489], startName: "Cyber Towers Hub", destName: "Gachibowli Stadium", distKm: "5.4 km", dangerBypassCount: 1 },
      { label: "Banjara Hills Rd 1 → Jubilee Hills Check Post", start: [17.4156, 78.4352], dest: [17.4300, 78.4075], startName: "Banjara Hills Rd 1", destName: "Jubilee Hills Jxn", distKm: "4.8 km", dangerBypassCount: 1 },
      { label: "Secunderabad Station → Begumpet Airport Rd", start: [17.4399, 78.4983], dest: [17.4447, 78.4664], startName: "Secunderabad Station", destName: "Begumpet Corridor", distKm: "4.2 km", dangerBypassCount: 2 },
      { label: "Charminar Old City → Mehdipatnam Ring Rd", start: [17.3616, 78.4747], dest: [17.3916, 78.4410], startName: "Charminar Monument", destName: "Mehdipatnam Jxn", distKm: "7.1 km", dangerBypassCount: 3 },
      { label: "Madhapur Durgam Cheruvu → Kondapur", start: [17.4344, 78.3888], dest: [17.4646, 78.3582], startName: "Durgam Cheruvu Bridge", destName: "Kondapur RTO", distKm: "5.9 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 401, id: 401, location: "Charminar Laad Bazaar Corridors", incident_count: 73, risk_score: 83, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Eve-Teasing", peak_time_of_day: "Evening (19:00 - 23:00)", avg_cctv_coverage: 15, lat: 17.3616, lon: 78.4747, top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
      { cluster_id: 402, id: 402, location: "Secunderabad Station North Exit", incident_count: 68, risk_score: 80, risk_category: "High", risk_level: "High", dominant_crime_type: "Luggage Snatching & Scams", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 21, lat: 17.4399, lon: 78.4983, top_crime_types: ["Theft", "Snatching"], color: "#ef4444" },
      { cluster_id: 403, id: 403, location: "Afzal Gunj Bus Terminal Surroundings", incident_count: 49, risk_score: 77, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Mobile Snatching", peak_time_of_day: "Evening (18:00 - 21:00)", avg_cctv_coverage: 13, lat: 17.3750, lon: 78.4780, top_crime_types: ["Snatching"], color: "#f59e0b" },
      { cluster_id: 404, id: 404, location: "Gachibowli ORR Dark Slipway", incident_count: 42, risk_score: 73, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Speed Trapping & Isolation", peak_time_of_day: "Night (23:30 - 03:30)", avg_cctv_coverage: 8, lat: 17.4435, lon: 78.3489, top_crime_types: ["Hazard"], color: "#f59e0b" },
      { cluster_id: 405, id: 405, location: "Mehdipatnam Rythu Bazar Underpass", incident_count: 36, risk_score: 69, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Stalking & Poor Lighting", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 10, lat: 17.3916, lon: 78.4410, top_crime_types: ["Harassment"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 17.4504, lng: 78.3808, location: "Hitec City Cyber Towers Beat", crime_count: 3, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 17.4156, lng: 78.4352, location: "Banjara Hills Road No 10 Post", crime_count: 2, risk_level: "Low", time: "19:45 - 21:00" },
      { order: 3, lat: 17.4399, lng: 78.4983, location: "Secunderabad Station Outer Beat", crime_count: 13, risk_level: "High", time: "21:15 - 22:30" },
      { order: 4, lat: 17.3616, lng: 78.4747, location: "Charminar Heritage Patrol Loop", crime_count: 15, risk_level: "Critical", time: "22:45 - 00:00" },
      { order: 5, lat: 17.4447, lng: 78.4664, location: "Begumpet Flyover Interceptor", crime_count: 6, risk_level: "Medium", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 280, value: 280 },
      { type: "Snatching", name: "Snatching", count: 180, value: 180 },
      { type: "Harassment", name: "Harassment", count: 110, value: 110 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 140, value: 140 },
      { type: "Cyber Fraud", name: "Cyber Fraud", count: 195, value: 195 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 120, value: 120, pct: "13.3%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 240, value: 240, pct: "26.5%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 320, value: 320, pct: "35.4%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 225, value: 225, pct: "24.8%" },
    ],
    incidentQueue: [
      { id: 401, crime_type: "SHE Team Harassment Intercept", title: "SHE Team Harassment Intercept", description: "Aggressive group blocking women pedestrian walkway near Charminar market.", category: "Harassment", severity: 7, status: "verified", location: "Charminar Laad Bazaar", lat: 17.3616, lon: 78.4747, created_at: "12 mins ago" },
      { id: 402, crime_type: "Motorcycle Snatching Alert", title: "Motorcycle Snatching Alert", description: "Suspects on Yamaha FZ snatched gold chain near Begumpet underpass.", category: "Snatching", severity: 8, status: "pending", location: "Begumpet Underpass Axis", lat: 17.4447, lon: 78.4664, created_at: "40 mins ago" },
    ],
  },

  // 5. CHENNAI
  {
    id: "chennai",
    name: "Chennai",
    shortName: "Chennai",
    state: "Tamil Nadu",
    zone: "South",
    center: [13.0827, 80.2707],
    zoom: 12,
    emergencyCommand: "Greater Chennai Police Command • Kaaval Karangal 112",
    policeCommissioner: "Commissioner of Police, Greater Chennai",
    jurisdictionBadge: "Coastal Security & Metropolitan Grid",
    activePatrolUnits: 122,
    activeCameras: 4380,
    safetyScore: 91,
    responseMins: 3.8,
    activeIncidents24h: 11,
    resolutionRate: 93.4,
    presets: [
      { label: "T. Nagar Panagal Park → Marina Beach", start: [13.0418, 80.2341], dest: [13.0500, 80.2824], startName: "Panagal Park", destName: "Marina Promenade", distKm: "6.5 km", dangerBypassCount: 1 },
      { label: "Anna Nagar Roundtana → Nungambakkam High Rd", start: [13.0850, 80.2100], dest: [13.0600, 80.2400], startName: "Anna Nagar Tower", destName: "Nungambakkam Rd", distKm: "5.2 km", dangerBypassCount: 1 },
      { label: "Guindy Kathipara → Adyar Gandhi Nagar", start: [13.0067, 80.2024], dest: [13.0012, 78.2560], startName: "Kathipara Cloverleaf", destName: "Adyar Gandhi Nagar", distKm: "6.9 km", dangerBypassCount: 1 },
      { label: "Velachery MRTS → OMR Thoraipakkam", start: [12.9750, 80.2200], dest: [12.9350, 80.2350], startName: "Velachery Station", destName: "OMR IT Corridor", distKm: "5.5 km", dangerBypassCount: 2 },
      { label: "Chennai Central → Egmore Station", start: [13.0827, 80.2757], dest: [13.0780, 80.2600], startName: "Chennai Central Station", destName: "Egmore Terminus", distKm: "2.8 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 501, id: 501, location: "Koyambedu Wholesale Market Perimeter", incident_count: 72, risk_score: 85, risk_category: "High", risk_level: "High", dominant_crime_type: "Cash Robbery & Cargo Theft", peak_time_of_day: "Early Morning (03:00 - 07:00)", avg_cctv_coverage: 14, lat: 13.0694, lon: 80.1948, top_crime_types: ["Theft", "Robbery"], color: "#ef4444" },
      { cluster_id: 502, id: 502, location: "Broadway Bus Terminus & Parry's", incident_count: 64, risk_score: 81, risk_category: "High", risk_level: "High", dominant_crime_type: "Snatching & Crowd Scams", peak_time_of_day: "Evening (18:00 - 21:00)", avg_cctv_coverage: 17, lat: 13.0880, lon: 80.2850, top_crime_types: ["Pickpocketing"], color: "#ef4444" },
      { cluster_id: 503, id: 503, location: "Tambaram Railway Station East Subway", incident_count: 48, risk_score: 75, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Pedestrian Harassment", peak_time_of_day: "Night (21:30 - 01:00)", avg_cctv_coverage: 12, lat: 12.9249, lon: 80.1166, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 504, id: 504, location: "T. Nagar Ranganathan St Rear Alleys", incident_count: 44, risk_score: 72, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Bag Snatching", peak_time_of_day: "Evening (17:00 - 21:30)", avg_cctv_coverage: 24, lat: 13.0418, lon: 80.2341, top_crime_types: ["Snatching"], color: "#f59e0b" },
      { cluster_id: 505, id: 505, location: "Marina Beach Service Rd Darkspots", incident_count: 32, risk_score: 68, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Late-Night Eve Teasing", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 9, lat: 13.0500, lon: 80.2824, top_crime_types: ["Harassment"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 13.0418, lng: 80.2341, location: "T. Nagar Commercial Corridor", crime_count: 8, risk_level: "Medium", time: "18:00 - 19:30" },
      { order: 2, lat: 13.0067, lng: 80.2024, location: "Guindy Kathipara Junction Checkpost", crime_count: 3, risk_level: "Low", time: "19:45 - 21:00" },
      { order: 3, lat: 13.0694, lng: 80.1948, location: "Koyambedu Bus Terminal Rapid Unit", crime_count: 16, risk_level: "Critical", time: "21:15 - 22:30" },
      { order: 4, lat: 13.0827, lng: 80.2757, location: "Chennai Central Railway Subway", crime_count: 12, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 13.0500, lng: 80.2824, location: "Marina Promenade Safe Line", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 240, value: 240 },
      { type: "Snatching", name: "Snatching", count: 160, value: 160 },
      { type: "Harassment", name: "Harassment", count: 95, value: 95 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 130, value: 130 },
      { type: "Trespassing & Squabbles", name: "Trespassing & Squabbles", count: 80, value: 80 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 110, value: 110, pct: "15.6%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 195, value: 195, pct: "27.7%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 250, value: 250, pct: "35.5%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 150, value: 150, pct: "21.2%" },
    ],
    incidentQueue: [
      { id: 501, crime_type: "Produce Market Cargo Theft", title: "Produce Market Cargo Theft", description: "Unattended consignment crate pilfered during early hours unloading.", category: "Theft", severity: 5, status: "verified", location: "Koyambedu Gate 4", lat: 13.0694, lon: 80.1948, created_at: "20 mins ago" },
      { id: 502, crime_type: "Beach Promenade Phone Snatched", title: "Beach Promenade Phone Snatched", description: "Pedestrian targeted along dimmed service path near light house.", category: "Snatching", severity: 6, status: "pending", location: "Marina Beach South Loop", lat: 13.0500, lon: 80.2824, created_at: "55 mins ago" },
    ],
  },

  // 6. KOLKATA
  {
    id: "kolkata",
    name: "Kolkata",
    shortName: "Kolkata",
    state: "West Bengal",
    zone: "East",
    center: [22.5726, 88.3639],
    zoom: 12,
    emergencyCommand: "Kolkata Police HQ Lalbazar • Dial 100/112 Central Dispatch",
    policeCommissioner: "Commissioner of Police, Lalbazar",
    jurisdictionBadge: "Heritage Metro Police Command",
    activePatrolUnits: 115,
    activeCameras: 3950,
    safetyScore: 86,
    responseMins: 4.4,
    activeIncidents24h: 15,
    resolutionRate: 87.9,
    presets: [
      { label: "Park Street → Howrah Station", start: [22.5510, 88.3524], dest: [22.5830, 88.3426], startName: "Park Street Crossing", destName: "Howrah Terminus", distKm: "5.8 km", dangerBypassCount: 2 },
      { label: "Salt Lake Sector V → New Town City Centre", start: [22.5800, 88.4373], dest: [22.5950, 88.4680], startName: "Sector V Wipro More", destName: "City Centre 2 New Town", distKm: "6.2 km", dangerBypassCount: 1 },
      { label: "Gariahat Market → Victoria Memorial", start: [22.5190, 88.3670], dest: [22.5448, 88.3426], startName: "Gariahat Crossing", destName: "Victoria Memorial Gate", distKm: "4.9 km", dangerBypassCount: 1 },
      { label: "Shyambazar Five Point → Esplanade", start: [22.6020, 88.3710], dest: [22.5645, 88.3518], startName: "Shyambazar Crossing", destName: "Esplanade Metro", distKm: "5.1 km", dangerBypassCount: 2 },
      { label: "Ballygunge Circular Rd → Jadavpur University", start: [22.5300, 88.3650], dest: [22.4988, 88.3718], startName: "Ballygunge Phari", destName: "Jadavpur 8B Bus Stand", distKm: "4.4 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 601, id: 601, location: "Howrah Bridge Approach & Burrabazar", incident_count: 85, risk_score: 87, risk_category: "High", risk_level: "High", dominant_crime_type: "Crowd Snatching & Fraud", peak_time_of_day: "Evening (18:00 - 22:00)", avg_cctv_coverage: 19, lat: 22.5830, lon: 88.3426, top_crime_types: ["Theft", "Snatching"], color: "#ef4444" },
      { cluster_id: 602, id: 602, location: "Sealdah Station Flyover Underbelly", incident_count: 78, risk_score: 83, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Stalking", peak_time_of_day: "Night (21:00 - 01:30)", avg_cctv_coverage: 13, lat: 22.5670, lon: 88.3712, top_crime_types: ["Pickpocketing"], color: "#ef4444" },
      { cluster_id: 603, id: 603, location: "Park Circus 7-Point Crossing Slums", incident_count: 56, risk_score: 76, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Vehicle Tampering & Theft", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 11, lat: 22.5410, lon: 88.3680, top_crime_types: ["Vehicle Theft"], color: "#f59e0b" },
      { cluster_id: 604, id: 604, location: "Esplanade Tram Depot Alleyways", incident_count: 47, risk_score: 74, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Street Harassment", peak_time_of_day: "Evening (19:00 - 23:00)", avg_cctv_coverage: 16, lat: 22.5645, lon: 88.3518, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 605, id: 605, location: "Ultadanga Railway Underpass", incident_count: 39, risk_score: 70, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Low Lighting Blindspot", peak_time_of_day: "Midnight (00:00 - 04:00)", avg_cctv_coverage: 8, lat: 22.5910, lon: 88.3840, top_crime_types: ["Hazard"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 22.5510, lng: 88.3524, location: "Park Street Boulevard", crime_count: 3, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 22.5645, lng: 88.3518, location: "Esplanade Metro Intercept", crime_count: 7, risk_level: "Medium", time: "19:45 - 21:00" },
      { order: 3, lat: 22.5830, lng: 88.3426, location: "Howrah Station Terminus Beat", crime_count: 18, risk_level: "Critical", time: "21:15 - 22:30" },
      { order: 4, lat: 22.5670, lng: 88.3712, location: "Sealdah Flyover Patrol Zone", crime_count: 14, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 22.5800, lng: 88.4373, location: "Salt Lake Sector V Tech Hub", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 360, value: 360 },
      { type: "Snatching", name: "Snatching", count: 220, value: 220 },
      { type: "Harassment", name: "Harassment", count: 140, value: 140 },
      { type: "Public Disorder", name: "Public Disorder", count: 125, value: 125 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 110, value: 110 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 150, value: 150, pct: "15.7%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 260, value: 260, pct: "27.2%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 330, value: 330, pct: "34.6%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 215, value: 215, pct: "22.5%" },
    ],
    incidentQueue: [
      { id: 601, crime_type: "Howrah Bus Terminus Pickpocketing", title: "Howrah Bus Terminus Pickpocketing", description: "Purse stolen from commuter boarding bus 24A near Howrah station approach.", category: "Theft", severity: 6, status: "pending", location: "Howrah Bus Stand Bay 2", lat: 22.5830, lon: 88.3426, created_at: "30 mins ago" },
      { id: 602, crime_type: "Unlit Tram Corridor Hazard", title: "Unlit Tram Corridor Hazard", description: "Pedestrian slipway pitch black due to blown transformer near Esplanade.", category: "Hazard", severity: 5, status: "verified", location: "Esplanade Tram Shed Loop", lat: 22.5645, lon: 88.3518, created_at: "1 hour ago" },
    ],
  },

  // 7. PUNE
  {
    id: "pune",
    name: "Pune",
    shortName: "Pune",
    state: "Maharashtra",
    zone: "West",
    center: [18.5204, 73.8567],
    zoom: 12,
    emergencyCommand: "Pune Police Commissionerate • Nirbhaya & Damini Squad 112",
    policeCommissioner: "Joint CP (Crime & Citizen Safety)",
    jurisdictionBadge: "Pune Metropolitan Smart Grid",
    activePatrolUnits: 98,
    activeCameras: 3400,
    safetyScore: 90,
    responseMins: 4.0,
    activeIncidents24h: 10,
    resolutionRate: 92.6,
    presets: [
      { label: "Shivaji Nagar → Hinjewadi Ph 1 IT Park", start: [18.5314, 73.8553], dest: [18.5913, 73.7389], startName: "Shivaji Nagar Metro", destName: "Hinjewadi Phase 1", distKm: "15.2 km", dangerBypassCount: 2 },
      { label: "FC Road Deccan → Koregaon Park", start: [18.5246, 73.8415], dest: [18.5362, 73.8940], startName: "FC Road Deccan Gymkhana", destName: "Koregaon Park Lane 7", distKm: "7.1 km", dangerBypassCount: 1 },
      { label: "Swargate Bus Stand → Pune Station", start: [18.4988, 73.8583], dest: [18.5284, 73.8744], startName: "Swargate Terminal", destName: "Pune Railway Station", distKm: "4.8 km", dangerBypassCount: 2 },
      { label: "Viman Nagar → Magarpatta Cybercity", start: [18.5679, 73.9143], dest: [18.5144, 73.9281], startName: "Viman Nagar Phoenix Mall", destName: "Magarpatta Tower", distKm: "7.8 km", dangerBypassCount: 1 },
      { label: "Baner High Street → Kothrud", start: [18.5590, 73.7868], dest: [18.5074, 73.8077], startName: "Baner High St", destName: "Kothrud Stand", distKm: "7.3 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 701, id: 701, location: "Swargate Bus Terminal Rear Lanes", incident_count: 62, risk_score: 84, risk_category: "High", risk_level: "High", dominant_crime_type: "Mobile Snatching & Extortion", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 14, lat: 18.4988, lon: 73.8583, top_crime_types: ["Theft", "Snatching"], color: "#ef4444" },
      { cluster_id: 702, id: 702, location: "Pune Station Foot Over Bridge", incident_count: 54, risk_score: 79, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Bag Slitting", peak_time_of_day: "Evening (19:00 - 23:00)", avg_cctv_coverage: 18, lat: 18.5284, lon: 73.8744, top_crime_types: ["Theft"], color: "#ef4444" },
      { cluster_id: 703, id: 703, location: "Katraj Tunnel Bypass Service Cut", incident_count: 41, risk_score: 76, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Vehicle Interception & Darkspot", peak_time_of_day: "Midnight (00:00 - 04:00)", avg_cctv_coverage: 6, lat: 18.4480, lon: 73.8640, top_crime_types: ["Hazard"], color: "#f59e0b" },
      { cluster_id: 704, id: 704, location: "Hinjewadi Ph 3 Isolated Stretches", incident_count: 36, risk_score: 72, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Late-Night Cab Route Vulnerability", peak_time_of_day: "Night (23:00 - 03:00)", avg_cctv_coverage: 10, lat: 18.5800, lon: 73.7100, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 705, id: 705, location: "Hadapsar Gadital Chowk", incident_count: 30, risk_score: 68, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Street Squabbles & Theft", peak_time_of_day: "Evening (18:30 - 22:00)", avg_cctv_coverage: 12, lat: 18.5020, lon: 73.9350, top_crime_types: ["Theft"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 18.5246, lng: 73.8415, location: "FC Road Student Corridor", crime_count: 2, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 18.5314, lng: 73.8553, location: "Shivaji Nagar Metro Hub", crime_count: 6, risk_level: "Medium", time: "19:45 - 21:00" },
      { order: 3, lat: 18.4988, lng: 73.8583, location: "Swargate Bus Terminal Checkpoint", crime_count: 15, risk_level: "Critical", time: "21:15 - 22:30" },
      { order: 4, lat: 18.5284, lng: 73.8744, location: "Pune Station Frontage Unit", crime_count: 11, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 18.5362, lng: 73.8940, location: "Koregaon Park Lane 7 Beat", crime_count: 3, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 210, value: 210 },
      { type: "Snatching", name: "Snatching", count: 145, value: 145 },
      { type: "Harassment", name: "Harassment", count: 85, value: 85 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 160, value: 160 },
      { type: "Two-Wheeler Tampering", name: "Two-Wheeler Tampering", count: 90, value: 90 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 105, value: 105, pct: "15.2%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 185, value: 185, pct: "26.8%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 240, value: 240, pct: "34.8%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 160, value: 160, pct: "23.2%" },
    ],
    incidentQueue: [
      { id: 701, crime_type: "Damini Squad Transit Intercept", title: "Damini Squad Transit Intercept", description: "Suspicious vehicle intercepted after distress call from female tech worker on Hinjewadi link.", category: "Harassment", severity: 7, status: "verified", location: "Hinjewadi Flyover Cut", lat: 18.5913, lon: 73.7389, created_at: "15 mins ago" },
      { id: 702, crime_type: "Motorcycle Theft from Cafe Parking", title: "Motorcycle Theft from Cafe Parking", description: "Royal Enfield bike reported missing from FC Road parking stretch.", category: "Theft", severity: 5, status: "pending", location: "FC Road Deccan", lat: 18.5246, lon: 73.8415, created_at: "50 mins ago" },
    ],
  },

  // 8. JAIPUR
  {
    id: "jaipur",
    name: "Jaipur",
    shortName: "Jaipur",
    state: "Rajasthan",
    zone: "North",
    center: [26.9124, 75.7873],
    zoom: 12,
    emergencyCommand: "Jaipur Police Commissionerate • Abhay Command 112",
    policeCommissioner: "Commissioner of Police, Jaipur",
    jurisdictionBadge: "Pink City Heritage Security Command",
    activePatrolUnits: 86,
    activeCameras: 2890,
    safetyScore: 87,
    responseMins: 4.6,
    activeIncidents24h: 13,
    resolutionRate: 88.8,
    presets: [
      { label: "MI Road Panch Batti → Malviya Nagar GT", start: [26.9180, 75.8010], dest: [26.8530, 75.8050], startName: "MI Road Panch Batti", destName: "Gaurav Tower Malviya Nagar", distKm: "8.6 km", dangerBypassCount: 1 },
      { label: "Hawa Mahal Badi Choupad → Mansarovar", start: [26.9242, 75.8306], dest: [26.8580, 75.7650], startName: "Hawa Mahal Heritage Gate", destName: "Mansarovar Metro", distKm: "11.2 km", dangerBypassCount: 2 },
      { label: "C-Scheme Ashok Nagar → Raja Park", start: [26.9100, 75.8000], dest: [26.8950, 75.8270], startName: "C-Scheme Central Park", destName: "Raja Park Market", distKm: "4.5 km", dangerBypassCount: 1 },
      { label: "Jaipur Railway Station → Sindhi Camp", start: [26.9196, 75.7878], dest: [26.9238, 75.7972], startName: "Jaipur Junction", destName: "Sindhi Camp Bus Stand", distKm: "2.1 km", dangerBypassCount: 2 },
      { label: "Vaishali Nagar Amrapali → Tonk Road", start: [26.9080, 75.7420], dest: [26.8720, 75.8000], startName: "Vaishali Nagar Amrapali", destName: "Tonk Road Flyover", distKm: "8.4 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 801, id: 801, location: "Sindhi Camp Central Bus Stand", incident_count: 65, risk_score: 85, risk_category: "High", risk_level: "High", dominant_crime_type: "Tourist Scams & Pickpocketing", peak_time_of_day: "Night (21:00 - 01:30)", avg_cctv_coverage: 16, lat: 26.9238, lon: 75.7972, top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
      { cluster_id: 802, id: 802, location: "Badi Choupad & Johari Bazaar Alleys", incident_count: 53, risk_score: 78, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Jewelry Snatching & Theft", peak_time_of_day: "Evening (18:00 - 21:30)", avg_cctv_coverage: 20, lat: 26.9242, lon: 75.8306, top_crime_types: ["Snatching"], color: "#f59e0b" },
      { cluster_id: 803, id: 803, location: "Station Road Unlit Stretches", incident_count: 42, risk_score: 74, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Late-Night Stalking", peak_time_of_day: "Midnight (00:00 - 03:30)", avg_cctv_coverage: 9, lat: 26.9196, lon: 75.7878, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 804, id: 804, location: "Sanganer Flyover Industrial Border", incident_count: 36, risk_score: 71, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Two-Wheeler Theft", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 8, lat: 26.8150, lon: 75.7700, top_crime_types: ["Vehicle Theft"], color: "#f59e0b" },
      { cluster_id: 805, id: 805, location: "Transport Nagar Ghat Ki Guni Pass", incident_count: 29, risk_score: 67, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Heavy Vehicle Blindspot", peak_time_of_day: "Night (23:00 - 04:00)", avg_cctv_coverage: 7, lat: 26.9020, lon: 75.8500, top_crime_types: ["Hazard"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 26.9180, lng: 75.8010, location: "MI Road Commercial Boulevard", crime_count: 3, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 26.9238, lng: 75.7972, location: "Sindhi Camp Bus Terminal Rapid Beat", crime_count: 16, risk_level: "Critical", time: "19:45 - 21:00" },
      { order: 3, lat: 26.9196, lng: 75.7878, location: "Jaipur Junction Railway Gate", crime_count: 12, risk_level: "High", time: "21:15 - 22:30" },
      { order: 4, lat: 26.9242, lng: 75.8306, location: "Badi Choupad Walled City Patrol", crime_count: 10, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 26.9100, lng: 75.8000, location: "C-Scheme High Security Zone", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 205, value: 205 },
      { type: "Snatching", name: "Snatching", count: 135, value: 135 },
      { type: "Harassment", name: "Harassment", count: 90, value: 90 },
      { type: "Tourist Fraud", name: "Tourist Fraud", count: 120, value: 120 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 105, value: 105 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 95, value: 95, pct: "14.5%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 170, value: 170, pct: "26.0%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 235, value: 235, pct: "35.9%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 155, value: 155, pct: "23.6%" },
    ],
    incidentQueue: [
      { id: 801, crime_type: "Tourist Overcharging & Intimidation", title: "Tourist Overcharging & Intimidation", description: "Foreign traveler intimidated into paying extortionate fare near Sindhi Camp.", category: "Harassment", severity: 6, status: "verified", location: "Sindhi Camp Platform 3", lat: 26.9238, lon: 75.7972, created_at: "28 mins ago" },
      { id: 802, crime_type: "Camera Bag Theft in Walled City", title: "Camera Bag Theft in Walled City", description: "DSLR kit taken from tourist seated near Badi Choupad tea shop.", category: "Theft", severity: 5, status: "pending", location: "Badi Choupad Johari Bazaar", lat: 26.9242, lon: 75.8306, created_at: "1 hour ago" },
    ],
  },

  // 9. LUCKNOW
  {
    id: "lucknow",
    name: "Lucknow",
    shortName: "Lucknow",
    state: "Uttar Pradesh",
    zone: "North",
    center: [26.8467, 80.9462],
    zoom: 12,
    emergencyCommand: "Lucknow Police Commissionerate • UP 112 State Central Command",
    policeCommissioner: "Commissioner of Police & UP 112 DG",
    jurisdictionBadge: "UP 112 Apex Command Center",
    activePatrolUnits: 110,
    activeCameras: 3620,
    safetyScore: 85,
    responseMins: 4.3,
    activeIncidents24h: 17,
    resolutionRate: 88.0,
    presets: [
      { label: "Hazratganj GPO → Gomti Nagar Riverside", start: [26.8500, 80.9440], dest: [26.8550, 80.9750], startName: "Hazratganj GPO", destName: "Gomti Nagar Marine Drive", distKm: "5.4 km", dangerBypassCount: 1 },
      { label: "Charbagh Station → Alambagh Terminal", start: [26.8322, 80.9238], dest: [26.8150, 80.9020], startName: "Charbagh Railway Hub", destName: "Alambagh Bus Terminal", distKm: "3.6 km", dangerBypassCount: 2 },
      { label: "Chowk Heritage Market → Aminabad", start: [26.8670, 80.9020], dest: [26.8440, 80.9280], startName: "Chowk Clock Tower", destName: "Aminabad Central", distKm: "4.8 km", dangerBypassCount: 2 },
      { label: "Indira Nagar Munshipulia → Polytechnic", start: [26.8850, 80.9850], dest: [26.8680, 80.9920], startName: "Munshipulia Metro", destName: "Polytechnic Crossing", distKm: "3.2 km", dangerBypassCount: 1 },
      { label: "Mahanagar Nishatganj → Shaheed Path", start: [26.8720, 80.9520], dest: [26.8100, 81.0150], startName: "Nishatganj Bridge", destName: "Shaheed Path Junction", distKm: "11.5 km", dangerBypassCount: 2 },
    ],
    hotspots: [
      { cluster_id: 901, id: 901, location: "Charbagh Railway Station Subways", incident_count: 79, risk_score: 88, risk_category: "Critical", risk_level: "Critical", dominant_crime_type: "Organized Pickpocketing & Theft", peak_time_of_day: "Night (20:30 - 01:30)", avg_cctv_coverage: 22, lat: 26.8322, lon: 80.9238, top_crime_types: ["Theft", "Pickpocketing"], color: "#ef4444" },
      { cluster_id: 902, id: 902, location: "Aminabad Gadbadjhala Corridors", incident_count: 67, risk_score: 81, risk_category: "High", risk_level: "High", dominant_crime_type: "Mobile Snatching & Eve-Teasing", peak_time_of_day: "Evening (18:00 - 22:00)", avg_cctv_coverage: 15, lat: 26.8440, lon: 80.9280, top_crime_types: ["Snatching", "Harassment"], color: "#ef4444" },
      { cluster_id: 903, id: 903, location: "Alambagh Old Bus Stand Rear Stretches", incident_count: 49, risk_score: 77, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Stalking & Unlit Blindspots", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 10, lat: 26.8150, lon: 80.9020, top_crime_types: ["Harassment"], color: "#f59e0b" },
      { cluster_id: 904, id: 904, location: "Dubagga Chauraha Outer Ring Cut", incident_count: 42, risk_score: 73, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Two-Wheeler Interception", peak_time_of_day: "Midnight (00:00 - 04:00)", avg_cctv_coverage: 8, lat: 26.8720, lon: 80.8560, top_crime_types: ["Vehicle Theft"], color: "#f59e0b" },
      { cluster_id: 905, id: 905, location: "Kaiserbagh Bus Stand Slum Border", incident_count: 35, risk_score: 70, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Pedestrian Harassment", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 12, lat: 26.8520, lon: 80.9310, top_crime_types: ["Harassment"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 26.8500, lng: 80.9440, location: "Hazratganj Pedestrian Boulevard", crime_count: 3, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 26.8322, lng: 80.9238, location: "Charbagh Station Central Terminus", crime_count: 18, risk_level: "Critical", time: "19:45 - 21:00" },
      { order: 3, lat: 26.8440, lng: 80.9280, location: "Aminabad Commercial Market Post", crime_count: 12, risk_level: "High", time: "21:15 - 22:30" },
      { order: 4, lat: 26.8670, lng: 80.9020, location: "Chowk Old Lucknow Heritage Beat", crime_count: 7, risk_level: "Medium", time: "22:45 - 00:00" },
      { order: 5, lat: 26.8550, lng: 80.9750, location: "Gomti Nagar Marine Drive Patrol", crime_count: 2, risk_level: "Low", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 310, value: 310 },
      { type: "Snatching", name: "Snatching", count: 230, value: 230 },
      { type: "Harassment", name: "Harassment", count: 175, value: 175 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 140, value: 140 },
      { type: "Property Disputes", name: "Property Disputes", count: 115, value: 115 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 130, value: 130, pct: "13.4%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 245, value: 245, pct: "25.3%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 345, value: 345, pct: "35.6%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 250, value: 250, pct: "25.7%" },
    ],
    incidentQueue: [
      { id: 901, crime_type: "UP 112 SOS Distress Signal", title: "UP 112 SOS Distress Signal", description: "Mobile emergency button pushed by female pedestrian near Charbagh south subway.", category: "Harassment", severity: 8, status: "pending", location: "Charbagh Subways Gate 1", lat: 26.8322, lon: 80.9238, created_at: "8 mins ago" },
      { id: 902, crime_type: "Chain Snatching on Motorcycle", title: "Chain Snatching on Motorcycle", description: "Gold chain snatched outside crowded jewelry shop in Aminabad.", category: "Snatching", severity: 7, status: "verified", location: "Aminabad Central Chowk", lat: 26.8440, lon: 80.9280, created_at: "35 mins ago" },
    ],
  },

  // 10. AHMEDABAD
  {
    id: "ahmedabad",
    name: "Ahmedabad",
    shortName: "Ahmedabad",
    state: "Gujarat",
    zone: "West",
    center: [23.0225, 72.5714],
    zoom: 12,
    emergencyCommand: "Ahmedabad City Police • SHE Team & Suraksha Setu 112",
    policeCommissioner: "Commissioner of Police, Ahmedabad City",
    jurisdictionBadge: "Safe City Cyber-Surveillance Grid",
    activePatrolUnits: 104,
    activeCameras: 3800,
    safetyScore: 92,
    responseMins: 3.7,
    activeIncidents24h: 9,
    resolutionRate: 94.1,
    presets: [
      { label: "SG Highway Prahlad Nagar → Sabarmati Riverfront", start: [23.0120, 72.5080], dest: [23.0300, 72.5800], startName: "Prahlad Nagar SG Highway", destName: "Riverfront East Promenade", distKm: "9.2 km", dangerBypassCount: 1 },
      { label: "Kalupur Station → Manek Chowk", start: [23.0280, 72.6005], dest: [23.0245, 72.5890], startName: "Kalupur Junction", destName: "Manek Chowk Heritage", distKm: "2.1 km", dangerBypassCount: 1 },
      { label: "Vastrapur Lake → CG Road Navrangpura", start: [23.0360, 72.5290], dest: [23.0330, 72.5580], startName: "Vastrapur Lake Park", destName: "CG Road Axis", distKm: "4.1 km", dangerBypassCount: 1 },
      { label: "Gandhinagar Infocity → Motera Stadium", start: [23.1950, 72.6350], dest: [23.0920, 72.5970], startName: "Infocity IT Corridor", destName: "Narendra Modi Stadium", distKm: "12.4 km", dangerBypassCount: 1 },
      { label: "Bopal Ambli → Shivranjani Crossroads", start: [23.0320, 72.4780], dest: [23.0260, 72.5310], startName: "Bopal Ambli Junction", destName: "Shivranjani Cross", distKm: "6.2 km", dangerBypassCount: 1 },
    ],
    hotspots: [
      { cluster_id: 1001, id: 1001, location: "Kalupur Central Railway Station Outer", incident_count: 58, risk_score: 82, risk_category: "High", risk_level: "High", dominant_crime_type: "Mobile Snatching & Thefts", peak_time_of_day: "Night (21:00 - 01:00)", avg_cctv_coverage: 18, lat: 23.0280, lon: 72.6005, top_crime_types: ["Theft", "Snatching"], color: "#ef4444" },
      { cluster_id: 1002, id: 1002, location: "Geeta Mandir Central ST Bus Stand", incident_count: 51, risk_score: 79, risk_category: "High", risk_level: "High", dominant_crime_type: "Pickpocketing & Scams", peak_time_of_day: "Evening (18:30 - 22:30)", avg_cctv_coverage: 16, lat: 23.0140, lon: 72.5920, top_crime_types: ["Theft"], color: "#ef4444" },
      { cluster_id: 1003, id: 1003, location: "Narol Circle Heavy Vehicle Corridor", incident_count: 39, risk_score: 75, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Dark Intersections & Accidents", peak_time_of_day: "Midnight (00:00 - 04:00)", avg_cctv_coverage: 9, lat: 22.9750, lon: 72.6000, top_crime_types: ["Hazard"], color: "#f59e0b" },
      { cluster_id: 1004, id: 1004, location: "C.G. Road Back-Alley Parking Lots", incident_count: 31, risk_score: 68, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Vehicle Theft & Vandalism", peak_time_of_day: "Evening (19:00 - 23:00)", avg_cctv_coverage: 14, lat: 23.0330, lon: 72.5580, top_crime_types: ["Vehicle Theft"], color: "#f59e0b" },
      { cluster_id: 1005, id: 1005, location: "Odhav Industrial Ring Road Cut", incident_count: 26, risk_score: 66, risk_category: "Moderate", risk_level: "Moderate", dominant_crime_type: "Low Illumination Blindspot", peak_time_of_day: "Night (22:00 - 02:00)", avg_cctv_coverage: 8, lat: 23.0270, lon: 72.6680, top_crime_types: ["Hazard"], color: "#f59e0b" },
    ],
    patrolRoute: [
      { order: 1, lat: 23.0330, lng: 72.5580, location: "CG Road Commercial Strip", crime_count: 2, risk_level: "Low", time: "18:00 - 19:30" },
      { order: 2, lat: 23.0300, lng: 72.5800, location: "Sabarmati Riverfront East Promenade", crime_count: 3, risk_level: "Low", time: "19:45 - 21:00" },
      { order: 3, lat: 23.0280, lng: 72.6005, location: "Kalupur Railway Station North Check", crime_count: 14, risk_level: "Critical", time: "21:15 - 22:30" },
      { order: 4, lat: 23.0140, lng: 72.5920, location: "Geeta Mandir Bus Stand Rapid Unit", crime_count: 10, risk_level: "High", time: "22:45 - 00:00" },
      { order: 5, lat: 23.0250, lng: 72.5050, location: "SG Highway Tech Corridor Patrol", crime_count: 5, risk_level: "Medium", time: "00:15 - 02:00" },
    ],
    crime_by_type: [
      { type: "Theft & Larceny", name: "Theft & Larceny", count: 180, value: 180 },
      { type: "Snatching", name: "Snatching", count: 110, value: 110 },
      { type: "Vehicle Theft", name: "Vehicle Theft", count: 135, value: 135 },
      { type: "Harassment", name: "Harassment", count: 65, value: 65 },
      { type: "Traffic Obstruction", name: "Traffic Obstruction", count: 90, value: 90 },
    ],
    crime_by_time_of_day: [
      { time_of_day: "Morning (06:00 - 12:00)", name: "Morning (06:00 - 12:00)", count: 90, value: 90, pct: "15.5%" },
      { time_of_day: "Afternoon (12:00 - 18:00)", name: "Afternoon (12:00 - 18:00)", count: 150, value: 150, pct: "25.9%" },
      { time_of_day: "Evening (18:00 - 22:00)", name: "Evening (18:00 - 22:00)", count: 210, value: 210, pct: "36.2%" },
      { time_of_day: "Night (22:00 - 06:00)", name: "Night (22:00 - 06:00)", count: 130, value: 130, pct: "22.4%" },
    ],
    incidentQueue: [
      { id: 1001, crime_type: "SHE Team Rapid Intervention", title: "SHE Team Rapid Intervention", description: "SHE Team patrolling van intervened to assist stranded female commuter at Riverfront walkway.", category: "Support", severity: 4, status: "verified", location: "Sabarmati Riverfront Walkway", lat: 23.0300, lon: 72.5800, created_at: "22 mins ago" },
      { id: 1002, crime_type: "Commercial Scooter Lift", title: "Commercial Scooter Lift", description: "Activa scooter stolen from CG Road market parking basement.", category: "Theft", severity: 5, status: "pending", location: "CG Road Navrangpura", lat: 23.0330, lon: 72.5580, created_at: "1 hour ago" },
    ],
  },
];

// Helper to look up a city by id or name
export function getCityMetadata(cityNameOrId: string = "Delhi"): CityMetadata {
  const query = cityNameOrId.trim().toLowerCase();
  const found = INDIAN_CITIES.find(
    (c) =>
      c.id.toLowerCase() === query ||
      c.name.toLowerCase() === query ||
      c.shortName.toLowerCase() === query ||
      query.includes(c.shortName.toLowerCase()) ||
      c.shortName.toLowerCase().includes(query)
  );
  return found || INDIAN_CITIES[0];
}

// Fallback for Police Dashboard stats by city
export function getFallbackPoliceDashboard(cityName: string) {
  const city = getCityMetadata(cityName);
  return {
    city: city.name,
    summary: {
      total_crimes_indexed: city.activeCameras * 0.8 + 2400,
      total_crimes_recorded: Math.round(city.activeCameras * 0.95 + 2800),
      active_hotspot_clusters: city.hotspots.length,
      avg_police_response_time_minutes: city.responseMins,
      resolution_rate_percent: city.resolutionRate,
      resolved_crimes: Math.round((city.activeCameras * 0.95 + 2800) * (city.resolutionRate / 100)),
      verified_incidents: Math.round(city.activeCameras * 0.28),
      active_dbscan_hotspots: city.hotspots.length + 8,
      live_patrolling_units: city.activePatrolUnits,
      pending_verification: city.incidentQueue.filter((q) => q.status === "pending").length + 3,
      average_response_mins: city.responseMins,
    },
    crime_by_type: city.crime_by_type,
    crime_by_time_of_day: city.crime_by_time_of_day,
    top_5_hotspots: city.hotspots.slice(0, 5),
  };
}

// Fallback for incident queue by city
export function getFallbackIncidentQueue(cityName: string) {
  const city = getCityMetadata(cityName);
  return city.incidentQueue;
}

// Fallback for hotspots by city (for Citizen Map)
export function getFallbackCityHotspots(cityName: string) {
  const city = getCityMetadata(cityName);
  return {
    hotspots: city.hotspots.map((h) => ({
      id: h.id,
      location: h.location,
      lat: h.lat,
      lon: h.lon,
      risk_score: h.risk_score,
      risk_level: h.risk_level,
      top_crime_types: h.top_crime_types || [h.dominant_crime_type],
      color: h.color || (h.risk_score > 80 ? "#ef4444" : h.risk_score > 60 ? "#f59e0b" : "#10b981"),
    })),
  };
}

// Fallback for heatmap points by city
export function getFallbackHeatmapPoints(cityName: string) {
  const city = getCityMetadata(cityName);
  const [lat, lon] = city.center;
  return [
    { lat: lat + 0.02, lon: lon + 0.01, intensity: 0.85 },
    { lat: lat - 0.02, lon: lon - 0.015, intensity: 0.65 },
    { lat: lat + 0.015, lon: lon - 0.025, intensity: 0.9 },
    { lat: lat - 0.028, lon: lon + 0.018, intensity: 0.5 },
    { lat: lat + 0.035, lon: lon + 0.025, intensity: 0.75 },
    { lat: lat + 0.005, lon: lon + 0.03, intensity: 0.6 },
    { lat: lat - 0.015, lon: lon + 0.04, intensity: 0.7 },
  ];
}
