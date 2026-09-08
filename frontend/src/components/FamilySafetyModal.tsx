"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface FamilySafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  city: string;
}

export default function FamilySafetyModal({
  isOpen,
  onClose,
  origin,
  destination,
  city,
}: FamilySafetyModalProps) {
  const [tripData, setTripData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartFamilyTracking = async () => {
    setLoading(true);
    try {
      const res = await api.startFamilyMode({
        origin: origin || "Connaught Place",
        destination: destination || "Saket",
        city,
        eta_minutes: 25,
      });
      setTripData(res);
    } catch (e) {
      console.error("Failed to start family trip:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (tripData?.share_url) {
      navigator.clipboard.writeText(tripData.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          padding: "1.75rem",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.5rem" }}>🛡️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                Family Safety Live Mode
              </h2>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Live GPS Trip Sharing & Geofence Alerts
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>

        {!tripData ? (
          <div>
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Share your live journey status with loved ones. If you deviate from the verified green corridor or arrive late, your trusted contacts will be alerted automatically.
            </p>

            <div style={{ padding: "12px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "10px", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>Trip Details:</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9" }}>
                📍 {origin || "Connaught Place"} → {destination || "Saket"} ({city})
              </div>
              <div style={{ fontSize: "0.78rem", color: "#38bdf8", marginTop: 4 }}>
                Estimated Transit ETA: ~25 minutes
              </div>
            </div>

            <button
              onClick={handleStartFamilyTracking}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              {loading ? "Generating Live Safety Link..." : "🚀 Generate Live Family Tracking Link"}
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                padding: "14px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "10px",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#86efac" }}>
                  ● LIVE TRACKING ACTIVE
                </span>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  ETA: ~{tripData.eta_minutes} mins
                </span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#f1f5f9" }}>
                Geofence Monitoring: <strong>{tripData.geofence_status}</strong>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 4 }}>
                🔗 Shareable Live Journey Link:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={tripData.share_url}
                  className="input-dark"
                  style={{ fontSize: "0.78rem" }}
                />
                <button
                  onClick={copyShareLink}
                  style={{
                    padding: "8px 14px",
                    background: copied ? "#22c55e" : "#3b82f6",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy Link"}
                </button>
              </div>
            </div>

            {/* Low-Battery Safety Mode Toggle */}
            <div
              style={{
                padding: "10px",
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>🔋 Low-Battery / Offline Mode</div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  Caches emergency contacts & nearest police locally
                </div>
              </div>
              <input
                type="checkbox"
                checked={batterySaver}
                onChange={(e) => setBatterySaver(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </div>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "8px",
                color: "#94a3b8",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
