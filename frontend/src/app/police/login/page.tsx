"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { PageBackground } from "@/components/shared/PageBackground";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function PoliceLoginPage() {
  const [officerId, setOfficerId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.policeLogin(officerId, pin);
      localStorage.setItem("rakshak_police_token", res.token);
      localStorage.setItem("rakshak_police_id", res.officer_id);
      localStorage.setItem("rakshak_police_role", res.role);
      router.push("/police/dashboard");
    } catch (e) {
      setError("Invalid officer ID or PIN. Use officer001 / 1234 for demo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBackground className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6">
      {/* Top Header with Theme Toggle */}
      <header className="w-full max-w-[420px] flex justify-between items-center z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)]" />
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold">
            Law Enforcement Portal
          </span>
        </div>
        <ThemeToggle />
      </header>

      <div className="w-full max-w-[420px] my-auto space-y-8 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-[var(--accent-dim)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)] mx-auto shadow-sm">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            Command Portal
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Authorized Law Enforcement & Patrol Units
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-7 sm:p-8 space-y-6 shadow-[var(--shadow-card)]">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Officer Identifier
              </label>
              <div className="relative">
                <input
                  id="officer-id-input"
                  type="text"
                  placeholder="e.g. officer001"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full h-12 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-dim)] transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Security PIN
              </label>
              <div className="relative">
                <input
                  id="officer-pin-input"
                  type="password"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full h-12 px-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-dim)] transition-all font-mono tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] p-3.5 flex items-center gap-2.5 text-[13px] text-[#ef4444]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="police-login-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white font-bold text-[15px] shadow-[0_4px_14px_rgba(2,132,199,0.35)] transition-all cursor-pointer disabled:opacity-50 mt-2"
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              }}
            >
              {loading ? "Authenticating..." : "Authenticate & Access"}
            </button>
          </form>

          {/* Demo Credentials Box */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-[12px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)]">Demo Credentials:</div>
            <div className="flex justify-between">
              <span>Officer: <code className="text-[var(--accent-primary)] font-bold">officer001</code></span>
              <span>PIN: <code className="text-[var(--accent-primary)] font-bold">1234</code></span>
            </div>
            <div className="flex justify-between">
              <span>Commander: <code className="text-[var(--accent-primary)] font-bold">commander01</code></span>
              <span>PIN: <code className="text-[var(--accent-primary)] font-bold">5678</code></span>
            </div>
          </div>
        </div>

        <p className="text-center text-[12px] text-[var(--text-muted)]">
          Rakshak AI · Enterprise Command & Public Safety Architecture
        </p>
      </div>

      <footer className="w-full text-center py-2 z-10 text-[11px] text-[var(--text-muted)]">
        Rakshak AI • Law Enforcement Command
      </footer>
    </PageBackground>
  );
}
