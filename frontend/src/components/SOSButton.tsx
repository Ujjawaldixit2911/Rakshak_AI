"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import EmergencyHubModal from "./EmergencyHubModal";

interface SOSButtonProps {
  city?: string;
  userCoords?: [number, number];
}

export default function SOSButton({
  city = "Delhi",
  userCoords = [28.6139, 77.2090],
}: SOSButtonProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"ambulance" | "police" | "sos">("sos");
  const [menuOpen, setMenuOpen] = useState(false);

  const openModalWithTab = (tab: "ambulance" | "police" | "sos") => {
    setModalTab(tab);
    setIsModalOpen(true);
    setMenuOpen(false);
  };

  const handleInstantSOS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus("sending");

    const triggerBroadcast = async (lat: number, lon: number) => {
      try {
        await fetch(`${API_BASE_URL}/api/sos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lon,
            city,
            user_id: 3,
            emergency_type: "CRITICAL SOS: Rapid 1-Tap Emergency Trigger",
          }),
        });
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 3500);
      } catch {
        console.error("SOS request failed");
        setStatus("idle");
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await triggerBroadcast(position.coords.latitude, position.coords.longitude);
        },
        async () => {
          await triggerBroadcast(userCoords[0], userCoords[1]);
        }
      );
    } else {
      await triggerBroadcast(userCoords[0], userCoords[1]);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
      >
        {/* Speed-Dial Sub-Buttons (Visible when menu is open) */}
        {menuOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            {/* 1. Ambulance Speed Button */}
            <button
              onClick={() => openModalWithTab("ambulance")}
              title="🚑 Request 108 Emergency Ambulance"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444, #b91c1c)",
                border: "2px solid rgba(255,255,255,0.3)",
                color: "#fff",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.5)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              🚑
            </button>

            {/* 2. Police 112 Speed Button */}
            <button
              onClick={() => openModalWithTab("police")}
              title="👮 Call 112 Police ERSS Dispatch"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                border: "2px solid rgba(255,255,255,0.3)",
                color: "#fff",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(59, 130, 246, 0.5)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              👮
            </button>
          </div>
        )}

        {/* Main Floating SOS Emergency Button */}
        <button
          id="sos-button"
          onClick={() => openModalWithTab("sos")}
          disabled={status === "sending"}
          title="🚨 Open Emergency Hub (Ambulance • Police • SOS Siren)"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background:
              status === "idle"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : status === "sending"
                ? "linear-gradient(135deg, #f97316, #ea580c)"
                : "linear-gradient(135deg, #22c55e, #16a34a)",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow:
              status === "idle"
                ? "0 0 0 0 rgba(239,68,68,0.5), 0 8px 32px rgba(239,68,68,0.5)"
                : "0 0 20px rgba(34,197,94,0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.3s",
            animation: status === "idle" ? "sos-pulse 2s ease-in-out infinite" : "none",
          }}
          onMouseEnter={(e) => {
            if (status === "idle") e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span
            style={{
              fontSize: status === "idle" ? "1rem" : "1.3rem",
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {status === "idle" ? "SOS" : status === "sending" ? "⏳" : "✓"}
          </span>
          {status === "idle" && (
            <span
              style={{
                fontSize: "0.45rem",
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.9)",
                marginTop: 2,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              HUB
            </span>
          )}
        </button>
      </div>

      {/* Emergency Hub Modal */}
      <EmergencyHubModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        city={city}
        userCoords={userCoords}
        initialTab={modalTab}
      />

      <style>{`
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 8px 32px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 14px rgba(239,68,68,0), 0 8px 32px rgba(239,68,68,0.4); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
