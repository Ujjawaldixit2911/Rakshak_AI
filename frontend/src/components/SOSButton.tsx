"use client";

import { useState } from "react";

export default function SOSButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSOS = async () => {
    setStatus("sending");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await sendSOS(position.coords.latitude, position.coords.longitude);
        },
        async () => {
          await sendSOS(26.8469, 81.0093); // Lucknow fallback
        }
      );
    } else {
      await sendSOS(26.8469, 81.0093);
    }
  };

  const sendSOS = async (lat: number, lon: number) => {
    try {
      await fetch("http://localhost:8000/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, user_id: 3, emergency_type: "Immediate Threat / Harassment" }),
      });
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 3500);
    } catch {
      console.error("SOS request failed");
      setStatus("idle");
    }
  };

  const bgColor =
    status === "idle"
      ? "linear-gradient(135deg, #ef4444, #dc2626)"
      : status === "sending"
      ? "linear-gradient(135deg, #f97316, #ea580c)"
      : "linear-gradient(135deg, #22c55e, #16a34a)";

  const glowColor =
    status === "idle"
      ? "rgba(239,68,68,0.5)"
      : status === "sending"
      ? "rgba(249,115,22,0.4)"
      : "rgba(34,197,94,0.5)";

  return (
    <button
      id="sos-button"
      onClick={handleSOS}
      disabled={status !== "idle"}
      title="Send SOS Alert to Police"
      style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 9999,
        width: 72, height: 72, borderRadius: "50%",
        background: bgColor,
        border: "2px solid rgba(255,255,255,0.2)",
        boxShadow: `0 0 0 0 ${glowColor}, 0 8px 32px ${glowColor}`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: status !== "idle" ? "not-allowed" : "pointer",
        transition: "transform 0.2s, box-shadow 0.3s",
        animation: status === "idle" ? "sos-pulse 2s ease-in-out infinite" : "none",
        opacity: status === "sending" ? 0.85 : 1,
      }}
      onMouseEnter={e => {
        if (status === "idle") (e.currentTarget as HTMLElement).style.transform = "scale(1.12)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <span style={{ fontSize: status === "idle" ? "1rem" : "1.3rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
        {status === "idle" ? "SOS" : status === "sending" ? "⏳" : "✓"}
      </span>
      {status === "idle" && (
        <span style={{ fontSize: "0.45rem", letterSpacing: "0.05em", color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: 600, textTransform: "uppercase" }}>
          ALERT
        </span>
      )}

      <style>{`
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 8px 32px rgba(239,68,68,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(239,68,68,0), 0 8px 32px rgba(239,68,68,0.35); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
