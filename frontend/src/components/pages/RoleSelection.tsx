"use client";

import React, { useState } from "react";
import {
  User,
  Briefcase,
  Ambulance,
  ShieldAlert,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth, UserFieldKey } from "@/context/AuthContext";
import { PageBackground } from "@/components/shared/PageBackground";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface RoleOption {
  key: UserFieldKey;
  icon: React.ElementType;
  title: string;
  badge: string;
  description: string;
  color: string;
  accentBg: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    key: "citizen",
    icon: User,
    title: "Citizen",
    badge: "Daily Commutes",
    description: "Safe routes for everyday travel & family tracking",
    color: "#0284c7",
    accentBg: "rgba(2, 132, 199, 0.1)",
  },
  {
    key: "corporate",
    icon: Briefcase,
    title: "Working Professional",
    badge: "Late Shifts & Cabs",
    description: "Safe transit for late shifts, cabs & departure simulation",
    color: "#0891b2",
    accentBg: "rgba(8, 145, 178, 0.1)",
  },
  {
    key: "emergency",
    icon: Ambulance,
    title: "Ambulance / Responder",
    badge: "Emergency Medical",
    description: "Rapid response routing, hospital POIs & safe corridors",
    color: "#059669",
    accentBg: "rgba(5, 150, 105, 0.1)",
  },
  {
    key: "police",
    icon: ShieldAlert,
    title: "Police",
    badge: "Law Enforcement",
    description: "Access incident feeds, hotspot clusters & patrol view",
    color: "#dc2626",
    accentBg: "rgba(220, 38, 38, 0.1)",
  },
];

interface RoleSelectionProps {
  onContinue?: () => void;
}

export function RoleSelection({ onContinue }: RoleSelectionProps) {
  const { user, saveRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserFieldKey | null>(
    (user?.roleField as UserFieldKey) || "citizen"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmRole = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await saveRole(selectedRole);
      if (onContinue) {
        onContinue();
      }
    } catch (e) {
      console.error("Failed to save role:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageBackground className="min-h-screen w-full flex flex-col justify-between items-center px-4 py-8 select-none">
      {/* Top Header Badge & Theme Toggle */}
      <header className="w-full max-w-2xl flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)]" />
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">
            Onboarding • Step 2 of 2
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user?.email && (
            <div className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">
              {user.email}
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-2xl my-auto flex flex-col items-center text-center py-6">
        {/* Heading & Subtext */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2.5">
            Who are you signing in as?
          </h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-[15px] max-w-md mx-auto">
            This helps us tailor your Rakshak safety intelligence and route recommendations.
          </p>
        </div>

        {/* 4 Large Selectable Cards Grid (2x2 on desktop, 1 col on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8 text-left">
          {ROLE_OPTIONS.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.key;

            return (
              <button
                key={role.key}
                type="button"
                onClick={() => setSelectedRole(role.key)}
                className={`
                  relative flex flex-col p-5 rounded-2xl cursor-pointer text-left
                  transition-all duration-200 outline-none
                  ${
                    isSelected
                      ? "bg-[var(--bg-card)] border-[var(--accent-primary)] shadow-[0_4px_20px_rgba(2,132,199,0.18)] ring-2 ring-[var(--accent-primary)]"
                      : "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-subtle)] hover:border-[var(--border-focus)] shadow-[var(--shadow-card)]"
                  }
                  border group
                `}
              >
                {/* Top Row: Icon + Checkmark / Badge */}
                <div className="flex items-center justify-between mb-3.5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                    style={{
                      background: isSelected ? role.accentBg : "var(--bg-surface)",
                      border: `1px solid ${isSelected ? role.color : "var(--border-subtle)"}`,
                    }}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: role.color }}
                    />
                  </div>

                  {/* Selected checkmark pill or role tag */}
                  {isSelected ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent-primary)] text-white text-xs font-semibold shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Selected</span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      {role.badge}
                    </span>
                  )}
                </div>

                {/* Role Title */}
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1 tracking-tight flex items-center gap-2">
                  <span>{role.title}</span>
                </h2>

                {/* Role Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {role.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Continue Primary Button */}
        <div className="w-full max-w-md flex flex-col items-center">
          <button
            type="button"
            disabled={!selectedRole || isSubmitting}
            onClick={handleConfirmRole}
            className="w-full min-h-[50px] text-[15px] font-bold text-white rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(2,132,199,0.35)] transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <span>Continue to Rakshak AI</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="mt-3 text-[12px] text-[var(--text-muted)]">
            You can modify your role anytime from the profile menu in navigation.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-2 z-10 text-[11px] text-[var(--text-muted)]">
        Rakshak AI • Role-Based Safety Platform
      </footer>
    </PageBackground>
  );
}

export default RoleSelection;
