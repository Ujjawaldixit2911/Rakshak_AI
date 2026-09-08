"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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
    <div style={{
      minHeight: "calc(100vh - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem",
      background: "radial-gradient(ellipse at 50% 0%, rgba(79,124,255,0.08) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #4f7cff, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
            boxShadow: "0 0 32px rgba(79,124,255,0.3)",
          }}>🚔</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>Police Command Portal</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Authorized personnel only · Rakshak AI
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Officer ID
              </label>
              <input
                id="officer-id-input"
                className="input-dark"
                placeholder="e.g. officer001"
                value={officerId}
                onChange={e => setOfficerId(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                PIN
              </label>
              <input
                id="officer-pin-input"
                className="input-dark"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: "0.84rem" }}>
                {error}
              </div>
            )}

            <button id="police-login-btn" type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 20, padding: "0.8rem" }}>
              {loading ? "Authenticating…" : "🔐 Access Dashboard"}
            </button>
          </div>
        </form>

        {/* Demo credentials */}
        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.2)", fontSize: "0.82rem" }}>
          <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: 6 }}>Demo Credentials</div>
          <div style={{ color: "var(--color-text-secondary)", lineHeight: 1.8 }}>
            Officer: <code style={{ color: "#a5b4fc" }}>officer001</code> / PIN: <code style={{ color: "#a5b4fc" }}>1234</code><br />
            Commander: <code style={{ color: "#a5b4fc" }}>commander01</code> / PIN: <code style={{ color: "#a5b4fc" }}>5678</code>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          Unauthorized access is prohibited under the IT Act 2000.
        </p>
      </div>
    </div>
  );
}
