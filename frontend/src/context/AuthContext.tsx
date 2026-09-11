"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

export type UserFieldKey =
  | "citizen"
  | "corporate"
  | "emergency"
  | "police"
  | "student"
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
    title: "Citizen",
    badge: "🛡️ Citizen",
    icon: "🧑",
    tagline: "Safe routes for everyday travel",
    description: "Designed for individuals and families seeking the safest travel routes, real-time hotspot avoidance, and instant SOS alerts.",
    primaryFeatures: [
      "AI Safe Route Navigator with risk scoring",
      "Live DBSCAN Crime Hotspots & Heatmaps",
      "One-Touch SOS & Family Live Tracking",
    ],
    color: "#0071e3",
    bgGlow: "rgba(0, 113, 227, 0.2)",
  },
  corporate: {
    key: "corporate",
    title: "Working Professional",
    badge: "💼 Professional",
    icon: "💼",
    tagline: "Safe transit for shifts & commutes",
    description: "Tailored for working professionals taking cabs, metros, or personal vehicles during off-peak and night hours.",
    primaryFeatures: [
      "Cab Route Deviation & Last-Mile Verification",
      "What-If Departure Hour vs Risk Simulator",
      "Automated Safe Arrival Ping to Emergency Contacts",
    ],
    color: "#06b6d4",
    bgGlow: "rgba(6, 182, 212, 0.2)",
  },
  emergency: {
    key: "emergency",
    title: "Ambulance / Emergency Responder",
    badge: "🚑 First Responder",
    icon: "🚑",
    tagline: "Rapid response routing & emergency POIs",
    description: "For medical teams, ambulance drivers, and disaster response personnel needing unobstructed and secure navigation.",
    primaryFeatures: [
      "Emergency POIs (Hospitals, Police, Fire Stations)",
      "High-Priority Navigation & Safe Corridors",
      "Live Route Risk & Incident Proximity Alerts",
    ],
    color: "#10b981",
    bgGlow: "rgba(16, 185, 129, 0.2)",
  },
  police: {
    key: "police",
    title: "Police",
    badge: "🚨 Police Patrol",
    icon: "👮",
    tagline: "Access incident & hotspot data",
    description: "Built for police officers, PCR vans, and security personnel monitoring high-density crime clusters and incident feeds.",
    primaryFeatures: [
      "Dynamic Patrol Route Planning & Heatmap Overlays",
      "Real-time Incident Reports & Spatial Clustering",
      "Direct link to Command Dispatch Center",
    ],
    color: "#ef4444",
    bgGlow: "rgba(239, 68, 68, 0.2)",
  },
  student: {
    key: "student",
    title: "Student & Youth",
    badge: "🎓 Campus Safety",
    icon: "🎓",
    tagline: "Late night library, coaching & transit shield.",
    description: "Optimized for students commuting during evening hours between campus and home.",
    primaryFeatures: [
      "Perimeter Alerts",
      "Well-lit Transit Corridors",
      "Quick Companion SOS",
    ],
    color: "#a855f7",
    bgGlow: "rgba(168, 85, 247, 0.2)",
  },
  researcher: {
    key: "researcher",
    title: "Urban Safety Researcher",
    badge: "🏙️ Safety Analytics",
    icon: "🏙️",
    tagline: "Crime pattern analysis & spatial AI.",
    description: "For civic analysts and urban planners investigating safety metrics.",
    primaryFeatures: [
      "Spatial Clustering",
      "Temporal Peak Risk",
      "Grid Intelligence",
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
  roleField: UserFieldKey | null;
  hasSelectedRole: boolean;
  loggedInAt: string;
}

interface AuthContextType {
  user: GoogleUserProfile | null;
  isAuthenticated: boolean;
  hasSelectedRole: boolean;
  isLoading: boolean;
  loginWithGoogle: (profile?: Partial<GoogleUserProfile>, initialRole?: UserFieldKey | null) => void;
  saveRole: (field: UserFieldKey) => Promise<void>;
  updateField: (field: UserFieldKey) => Promise<void>;
  resetRole: () => void;
  logout: () => void;
  isFieldModalOpen: boolean;
  openFieldModal: () => void;
  closeFieldModal: () => void;
  isHistoryModalOpen: boolean;
  openHistoryModal: () => void;
  closeHistoryModal: () => void;
  currentFieldInfo: UserFieldInfo;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "rakshak_google_user_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Hydrate user session safely on client mount to eliminate SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GoogleUserProfile;
        if (parsed && parsed.email) {
          setUser({
            ...parsed,
            hasSelectedRole: !!(parsed.roleField && USER_FIELDS[parsed.roleField]),
          });
        }
      }
    } catch (e) {
      console.warn("Failed to read user session:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync profile from backend if user exists
  useEffect(() => {
    if (!user?.googleId) return;

    const fetchRemoteProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile/safety-settings?userId=${encodeURIComponent(user.googleId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.role && USER_FIELDS[data.role as UserFieldKey]) {
            const roleKey = data.role as UserFieldKey;
            setUser((prev) => {
              if (!prev) return null;
              const updated = {
                ...prev,
                roleField: roleKey,
                hasSelectedRole: true,
              };
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn("Remote profile check skipped:", err);
      }
    };

    fetchRemoteProfile();
  }, [user?.googleId]);

  const loginWithGoogle = (profile?: Partial<GoogleUserProfile>, initialRole: UserFieldKey | null = null) => {
    const email = profile?.email || "ujjawal.rakshak@gmail.com";
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    const fullProfile: GoogleUserProfile = {
      googleId: profile?.googleId || `g_${Date.now()}`,
      name: profile?.name || "Ujjawal Dixit",
      email,
      avatar: profile?.avatar || defaultAvatar,
      roleField: initialRole,
      hasSelectedRole: !!(initialRole && USER_FIELDS[initialRole]),
      loggedInAt: new Date().toISOString(),
    };

    setUser(fullProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullProfile));
    } catch (e) {
      console.error("Failed to save user session:", e);
    }
  };

  const saveRole = async (field: UserFieldKey) => {
    if (!user) return;

    const updated: GoogleUserProfile = {
      ...user,
      roleField: field,
      hasSelectedRole: true,
    };

    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update user local state:", e);
    }

    // Persist role to server-side profile
    try {
      await fetch(`${API_BASE_URL}/api/profile/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.googleId,
          role: field,
        }),
      });
    } catch (err) {
      console.warn("Backend role persistence network warning:", err);
    }

    setIsFieldModalOpen(false);
  };

  const updateField = async (field: UserFieldKey) => {
    await saveRole(field);
  };

  const resetRole = () => {
    if (!user) return;
    const updated: GoogleUserProfile = {
      ...user,
      roleField: null,
      hasSelectedRole: false,
    };
    setUser(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear user session:", e);
    }
  };

  const currentFieldInfo =
    user?.roleField && USER_FIELDS[user.roleField]
      ? USER_FIELDS[user.roleField]
      : USER_FIELDS.citizen;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        hasSelectedRole: !!(user && user.hasSelectedRole && user.roleField),
        isLoading,
        loginWithGoogle,
        saveRole,
        updateField,
        resetRole,
        logout,
        isFieldModalOpen,
        openFieldModal: () => setIsFieldModalOpen(true),
        closeFieldModal: () => setIsFieldModalOpen(false),
        isHistoryModalOpen,
        openHistoryModal: () => setIsHistoryModalOpen(true),
        closeHistoryModal: () => setIsHistoryModalOpen(false),
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
