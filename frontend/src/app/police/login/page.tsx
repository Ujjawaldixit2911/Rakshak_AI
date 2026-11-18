"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, AlertCircle, ArrowLeft, CheckCircle2, Radio, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PageBackground } from "@/components/shared/PageBackground";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export const POLICE_DEMO_CREDENTIALS = {
  officer: {
    id: "officer001",
    pin: "1234",
    title: "Patrol Officer (PCR Alpha-9)",
    role: "OFFICER",
    desc: "Field patrol unit, incident reporting & route safety verification"
  },
  commander: {
    id: "commander01",
    pin: "5678",
    title: "Police Commander (ERSS 112)",
    role: "COMMANDER",
    desc: "City-wide command center, live spatial heatmap & dispatch grid"
  }
};

export default function PoliceLoginPage() {
  const [officerId, setOfficerId] = useState("officer001");
  const [pin, setPin] = useState("1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Execute login with specified credentials
  const executeLogin = async (targetId: string, targetPin: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.policeLogin(targetId, targetPin);
      if (typeof window !== "undefined") {
        localStorage.setItem("rakshak_police_token", res.token);
        localStorage.setItem("rakshak_police_id", res.officer_id);
        localStorage.setItem("rakshak_police_role", res.role);
        if (res.name) localStorage.setItem("rakshak_police_name", res.name);
      }
      router.push("/police/dashboard");
    } catch (e: any) {
      setError(e?.message || "Invalid Officer Identifier or Security PIN. Use officer001 / 1234 for demo.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId.trim() || !pin.trim()) {
      setError("Please enter both Officer ID and Security PIN.");
      return;
    }
    await executeLogin(officerId, pin);
  };

  // Instant 1-Click Demo Login
  const handleQuickDemo = (roleKey: "officer" | "commander") => {
    const cred = POLICE_DEMO_CREDENTIALS[roleKey];
    setOfficerId(cred.id);
    setPin(cred.pin);
    executeLogin(cred.id, cred.pin);
  };

  return (
    <PageBackground className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6">
      {/* Top Header with Back Navigation & Theme Toggle */}
      <header className="w-full max-w-[460px] flex justify-between items-center z-10 pt-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors no-underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Citizen Safety Map</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-[var(--accent-primary)] font-extrabold">
              ERSS 112 Grid
            </span>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>

      <div className="w-full max-w-[460px] my-auto space-y-6 z-10 py-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-[var(--accent-subtle)] border border-[rgba(5,150,105,0.3)] flex items-center justify-center text-[var(--accent-primary)] mx-auto shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-black tracking-[-0.03em] text-[var(--text-primary)]">
            Police & Command Portal
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto">
            Authorized access for State Police PCR Patrol Units, ERSS 112 Dispatchers & Area Commanders.
          </p>
        </div>

        {/* 1-Click Quick Demo Launcher Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-[var(--shadow-card)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-[var(--accent-primary)] flex items-center gap-1.5">
              <span>⚡</span> 1-Click Instant Demo Access
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-medium">No signup needed</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1-Click Officer */}
            <button
              type="button"
              onClick={() => handleQuickDemo("officer")}
              disabled={loading}
              className="p-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-left transition-all cursor-pointer group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">👮</span>
                <span className="text-[12px] font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                  Patrol Officer
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                officer001 • 1234
              </div>
            </button>

            {/* 1-Click Commander */}
            <button
              type="button"
              onClick={() => handleQuickDemo("commander")}
              disabled={loading}
              className="p-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-left transition-all cursor-pointer group shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🏛️</span>
                <span className="text-[12px] font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                  City Command
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-mono">
                commander01 • 5678
              </div>
            </button>
          </div>
        </div>

        {/* Manual Identifier Form */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-7 space-y-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Enter Officer Credentials</span>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Officer / Command ID
              </label>
              <input
                id="officer-id-input"
                type="text"
                placeholder="e.g. officer001 or commander01"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                autoComplete="username"
                required
                className="w-full h-11 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Security PIN
              </label>
              <input
                id="officer-pin-input"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full h-11 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-all font-mono tracking-widest"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] p-3 flex items-center gap-2.5 text-[12px] text-[#ef4444]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="police-login-btn"
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-white font-extrabold text-[14px] shadow-[0_4px_14px_rgba(5,150,105,0.35)] transition-all cursor-pointer disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              }}
            >
              {loading ? (
                <span>Authenticating Officer...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Command Center</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Clickable Demo Credentials Bar */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 text-[11px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex justify-between items-center">
              <span>Click to auto-fill credentials:</span>
              <span className="text-[10px] text-[var(--text-muted)]">Tap any row below</span>
            </div>

            <div
              onClick={() => {
                setOfficerId(POLICE_DEMO_CREDENTIALS.officer.id);
                setPin(POLICE_DEMO_CREDENTIALS.officer.pin);
                setError("");
              }}
              className="p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>👮</span>
                <span className="font-medium text-[var(--text-primary)]">Patrol Officer</span>
              </div>
              <div className="font-mono text-[10px]">
                <code className="text-[var(--accent-primary)] font-bold">officer001</code> / <code>1234</code>
              </div>
            </div>

            <div
              onClick={() => {
                setOfficerId(POLICE_DEMO_CREDENTIALS.commander.id);
                setPin(POLICE_DEMO_CREDENTIALS.commander.pin);
                setError("");
              }}
              className="p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>🏛️</span>
                <span className="font-medium text-[var(--text-primary)]">Police Commander</span>
              </div>
              <div className="font-mono text-[10px]">
                <code className="text-[var(--accent-primary)] font-bold">commander01</code> / <code>5678</code>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Rakshak AI · Law Enforcement & Public Safety Architecture · DPDP Act 2023
        </p>
      </div>

      <footer className="w-full text-center py-2 z-10 text-[11px] text-[var(--text-muted)]">
        Rakshak AI • 24x7 ERSS 112 Police Command Hub
      </footer>
    </PageBackground>
  );
}
