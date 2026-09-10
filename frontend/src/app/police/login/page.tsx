"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, User, Lock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Card, Badge } from "@/components/ui";

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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 sm:p-6 font-['Inter',-apple-system,'SF_Pro_Display',system-ui,sans-serif] selection:bg-[#0071e3]/30 selection:text-white">
      <div className="w-full max-w-[420px] space-y-8">
        {/* Apple-style Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-[#0071e3]/15 border border-[#0071e3]/30 flex items-center justify-center text-[#0071e3] mx-auto shadow-[0_0_30px_rgba(0,113,227,0.3)]">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-white">
            Command Portal
          </h1>
          <p className="text-[15px] text-white/50 leading-relaxed">
            Authorized Law Enforcement & Patrol Units
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-7 sm:p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-white/50">
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
                  className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-white/50">
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
                  className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/30 transition-all font-mono tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/25 p-3.5 flex items-center gap-2.5 text-[13px] text-[#ff3b30]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              id="police-login-btn"
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Authenticate & Access
            </Button>
          </form>

          {/* Demo Credentials Box */}
          <div className="pt-4 border-t border-white/[0.06] space-y-2 text-[12px] text-white/40">
            <div className="font-semibold text-white/60">Demo Credentials:</div>
            <div className="flex justify-between">
              <span>Officer: <code className="text-[#0071e3]">officer001</code></span>
              <span>PIN: <code className="text-[#0071e3]">1234</code></span>
            </div>
            <div className="flex justify-between">
              <span>Commander: <code className="text-[#0071e3]">commander01</code></span>
              <span>PIN: <code className="text-[#0071e3]">5678</code></span>
            </div>
          </div>
        </Card>

        <p className="text-center text-[12px] text-white/30">
          Rakshak AI · Enterprise Command & Public Safety Architecture
        </p>
      </div>
    </div>
  );
}
