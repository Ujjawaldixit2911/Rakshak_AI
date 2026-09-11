"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserFieldKey =
  | "citizen"
  | "student"
  | "corporate"
  | "police"
  | "emergency"
  | "researcher";

export interface UserFieldInfo {
  key: UserFieldKey;
  title: string;
  badge: string;
  icon: string;
  tagline: string;
  description: string;
  primaryFeatures: string[];
  color: string;
  bgGlow: string;
}

export const USER_FIELDS: Record<UserFieldKey, UserFieldInfo> = {
  citizen: {
    key: "citizen",
    title: "Citizen & Daily Commuter",
    badge: "🛡️ Citizen Safety",
    icon: "🛡️",
    tagline: "Everyday navigation with AI crime avoidance & night safety.",
    description: "Designed for individuals and families seeking the safest travel routes, real-time hotspot avoidance, and instant SOS alerts.",
    primaryFeatures: [
      "AI Safe Route Navigator with risk scoring",
      "Live DBSCAN Crime Hotspots & Heatmaps",
      "One-Touch SOS & Family Live Tracking",
    ],
    color: "#3b82f6",
    bgGlow: "rgba(59, 130, 246, 0.2)",
  },
  student: {
    key: "student",
    title: "Student & Campus Youth",
    badge: "🎓 Campus Safety",
    icon: "🎓",
    tagline: "Late night library, coaching & hostel transit shield.",
    description: "Optimized for college students and youth commuting during late evening hours between campus, metro stations, and hostels.",
    primaryFeatures: [
      "Late-Night Library & Campus Perimeter Alert",
      "Safe Transit Corridors with active streetlighting",
      "Quick Companion SOS & Location Beacon",
    ],
    color: "#a855f7",
    bgGlow: "rgba(168, 85, 247, 0.2)",
  },
  corporate: {
    key: "corporate",
    title: "Corporate & Night-Shift Professional",
    badge: "👩‍💼 Night Shift Pro",
    icon: "👩‍💼",
    tagline: "Safe transit for BPO, IT, healthcare & late shift workers.",
    description: "Tailored for working professionals taking cabs, metros, or personal vehicles during off-peak and night hours.",
    primaryFeatures: [
      "Cab Route Deviation & Last-Mile Verification",
      "What-If Departure Hour vs Risk Simulator",
      "Automated Safe Arrival Ping to Emergency Contacts",
    ],
    color: "#06b6d4",
    bgGlow: "rgba(6, 182, 212, 0.2)",
  },
  police: {
    key: "police",
    title: "Law Enforcement & Security Patrol",
    badge: "🚨 Police Patrol",
    icon: "🚨",
    tagline: "Hotspot intelligence, patrol optimization & emergency response.",
    description: "Built for police officers, PCR vans, and security personnel monitoring high-density crime clusters and incident feeds.",
    primaryFeatures: [
      "Dynamic Patrol Route Planning & Heatmap Overlays",
      "Real-time Incident Reports & Spatial Clustering",
      "Direct link to Command Dispatch Center",
    ],
    color: "#ef4444",
    bgGlow: "rgba(239, 68, 68, 0.2)",
  },
  emergency: {
    key: "emergency",
    title: "Emergency & Medical First Responder",
    badge: "🚑 First Responder",
    icon: "🚑",
    tagline: "Rapid response routing & emergency POI intelligence.",
    description: "For medical teams, ambulance drivers, and disaster response personnel needing unobstructed and secure navigation.",
    primaryFeatures: [
      "Emergency POIs (Hospitals, Police, Fire Stations)",
      "High-Priority Navigation & Safe Corridors",
      "Live Route Risk & Incident Proximity Alerts",
    ],
    color: "#10b981",
    bgGlow: "rgba(16, 185, 129, 0.2)",
  },
  researcher: {
    key: "researcher",
    title: "Urban Safety Researcher & Planner",
    badge: "🏙️ Safety Analytics",
    icon: "🏙️",
    tagline: "Crime pattern analysis, temporal forecasting & spatial AI.",
    description: "For urban planners, safety researchers, and civic analysts investigating crime density trends and safety metrics.",
    primaryFeatures: [
      "LSTM Crime Forecasting & Anomaly Detection",
      "Temporal 24-Hour Peak Risk Breakdown",
      "City-wide Safety Heatmap Grid Intelligence",
    ],
    color: "#f59e0b",
    bgGlow: "rgba(245, 158, 11, 0.2)",
  },
};

export interface GoogleUserProfile {
  googleId: string;
  name: string;
  email: string;
  avatar: string;
  roleField: UserFieldKey;
  loggedInAt: string;
}

interface AuthContextType {
  user: GoogleUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (profile: Partial<GoogleUserProfile>, field: UserFieldKey) => void;
  updateField: (field: UserFieldKey) => void;
  logout: () => void;
  isFieldModalOpen: boolean;
  openFieldModal: () => void;
  closeFieldModal: () => void;
  currentFieldInfo: UserFieldInfo;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "rakshak_google_user_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GoogleUserProfile;
        if (parsed && parsed.email) {
          if (!parsed.roleField || !USER_FIELDS[parsed.roleField]) {
            parsed.roleField = "citizen";
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to read user session:", e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  const loginWithGoogle = (profile: Partial<GoogleUserProfile>, field: UserFieldKey) => {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      profile.email || "user"
    )}`;

    const fullProfile: GoogleUserProfile = {
      googleId: profile.googleId || `g_${Date.now()}`,
      name: profile.name || "Rakshak User",
      email: profile.email || "user@gmail.com",
      avatar: profile.avatar || defaultAvatar,
      roleField: field,
      loggedInAt: new Date().toISOString(),
    };

    setUser(fullProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullProfile));
    } catch (e) {
      console.error("Failed to save user session:", e);
    }
  };

  const updateField = (field: UserFieldKey) => {
    if (!user) return;
    const updated = { ...user, roleField: field };
    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update user field:", e);
    }
    setIsFieldModalOpen(false);
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear user session:", e);
    }
  };

  const currentFieldInfo = user && USER_FIELDS[user.roleField]
    ? USER_FIELDS[user.roleField]
    : USER_FIELDS.citizen;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        updateField,
        logout,
        isFieldModalOpen,
        openFieldModal: () => setIsFieldModalOpen(true),
        closeFieldModal: () => setIsFieldModalOpen(false),
        currentFieldInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
