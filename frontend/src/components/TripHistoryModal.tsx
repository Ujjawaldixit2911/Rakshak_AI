"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { HistoryCard, JourneyHistoryRecord } from "@/components/HistoryCard";
import { Clock, X, Shield } from "lucide-react";
import { safeApiFetch } from "@/lib/api";

const DEFAULT_HISTORY_ITEMS: JourneyHistoryRecord[] = [
  {
    id: "hist-1",
    source: "Connaught Place",
    destination: "Saket Metro",
    sourceLat: 28.6315,
    sourceLon: 77.2167,
    destLat: 28.5245,
    destLon: 77.2066,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    safetyScore: 92,
    routeType: "Safest",
    distanceKm: 14.8,
    durationMin: 32,
  },
  {
    id: "hist-2",
    source: "Rohini Sector 14",
    destination: "Hauz Khas Village",
    sourceLat: 28.7495,
    sourceLon: 77.0565,
    destLat: 28.5494,
    destLon: 77.2001,
    timestamp: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    safetyScore: 87,
    routeType: "Balanced",
    distanceKm: 26.3,
    durationMin: 54,
  },
  {
    id: "hist-3",
    source: "Noida Sector 18",
    destination: "Connaught Place",
    sourceLat: 28.5708,
    sourceLon: 77.3261,
    destLat: 28.6315,
    destLon: 77.2167,
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    safetyScore: 94,
    routeType: "Safest",
    distanceKm: 18.2,
    durationMin: 38,
  },
];

export default function TripHistoryModal() {
  const { isHistoryModalOpen, closeHistoryModal, user } = useAuth();
  const [historyItems, setHistoryItems] = useState<JourneyHistoryRecord[]>(DEFAULT_HISTORY_ITEMS);

  useEffect(() => {
    if (!user?.googleId) return;
    const fetchHistory = async () => {
      try {
        const res = await safeApiFetch(`/api/history?userId=${encodeURIComponent(user.googleId)}&limit=12`);
        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setHistoryItems(data);
          }
        }
      } catch (e) {
        // Fallback
      }
    };
    if (isHistoryModalOpen) {
      fetchHistory();
    }
  }, [user?.googleId, isHistoryModalOpen]);

  if (!isHistoryModalOpen || !user) return null;

  const handleRepeatJourney = (journey: JourneyHistoryRecord) => {
    closeHistoryModal();
    window.dispatchEvent(
      new CustomEvent("rakshak_repeat_journey", { detail: journey })
    );
    const el = document.getElementById("safety-map-section");
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bg-overlay, rgba(3, 7, 18, 0.75))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
      }}
      onClick={closeHistoryModal}
    >
      <div
        className="fade-in-up"
        style={{
          width: "100%",
          maxWidth: 820,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 24,
          padding: "1.75rem",
          boxShadow: "var(--shadow-modal)",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              background: "var(--accent-dim)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
            }}>
              <Clock style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  Recent Journeys & Safety History
                </h2>
                <span style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: "var(--accent-dim)",
                  color: "var(--accent-primary)",
                  fontWeight: 800,
                  border: "1px solid var(--border-subtle)",
                }}>
                  {historyItems.length} Records
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                Select any previous journey to instantly reload its safe corridor and emergency checkpoints.
              </p>
            </div>
          </div>

          <button
            onClick={closeHistoryModal}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Content list */}
        <div
          style={{
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
            padding: "4px 2px",
          }}
        >
          {historyItems.map((item) => (
            <HistoryCard
              key={item.id}
              journey={item}
              onRepeat={handleRepeatJourney}
              className="!max-w-none"
            />
          ))}
        </div>

        {/* Footer info */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.75rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Shield style={{ width: 14, height: 14, color: "#10b981" }} />
            <span>All journey metrics are protected under DPDP Act 2023.</span>
          </div>

          <button
            onClick={closeHistoryModal}
            style={{
              padding: "6px 14px",
              borderRadius: "10px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
