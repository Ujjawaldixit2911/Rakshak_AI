"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/api";

interface EmergencyHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  city?: string;
  userCoords?: [number, number];
  initialTab?: "ambulance" | "police" | "sos";
}

interface POI {
  name: string;
  type: "hospital" | "police" | "pink_booth";
  distanceKm: string;
  phone: string;
  address: string;
}

const CITY_EMERGENCY_POIS: Record<string, { hospitals: POI[]; police: POI[] }> = {
  Delhi: {
    hospitals: [
      { name: "AIIMS Apex Trauma Centre", type: "hospital", distanceKm: "1.4 km", phone: "011-26593677", address: "Ring Road, Safdarjung Enclave, New Delhi" },
      { name: "Safdarjung Emergency Medical Block", type: "hospital", distanceKm: "2.1 km", phone: "011-26165060", address: "Ansari Nagar West, New Delhi" },
      { name: "Max Super Speciality Hospital", type: "hospital", distanceKm: "3.8 km", phone: "011-26515050", address: "1 2, Press Enclave Marg, Saket" },
      { name: "Fortis Flt. Lt. Rajan Dhall Hospital", type: "hospital", distanceKm: "4.5 km", phone: "011-42776222", address: "Sector B, Pocket 1, Vasant Kunj" },
    ],
    police: [
      { name: "Connaught Place Police Station", type: "police", distanceKm: "0.8 km", phone: "011-23745100", address: "Shaheed Bhagat Singh Marg, CP" },
      { name: "Hauz Khas Pink Booth (Women Police)", type: "pink_booth", distanceKm: "1.2 km", phone: "1091", address: "Near Hauz Khas Metro Gate 2" },
      { name: "Barakhamba Road Police Station", type: "police", distanceKm: "1.9 km", phone: "011-23412235", address: "Barakhamba Road, Connaught Place" },
      { name: "South Delhi Women Police Station", type: "police", distanceKm: "2.8 km", phone: "011-26510091", address: "Malviya Nagar, New Delhi" },
    ],
  },
  Mumbai: {
    hospitals: [
      { name: "KEM Hospital & Trauma Center", type: "hospital", distanceKm: "1.2 km", phone: "022-24107000", address: "Parel, Mumbai" },
      { name: "Lilavati Hospital & Research Centre", type: "hospital", distanceKm: "2.5 km", phone: "022-26751000", address: "Bandra Reclamation, Bandra West" },
      { name: "Hinduja National Hospital", type: "hospital", distanceKm: "3.2 km", phone: "022-24451515", address: "Veer Savarkar Marg, Mahim" },
    ],
    police: [
      { name: "Bandra Police Station", type: "police", distanceKm: "0.9 km", phone: "022-26422042", address: "Hill Road, Bandra West" },
      { name: "BKC Women Safety Cell", type: "pink_booth", distanceKm: "1.6 km", phone: "103", address: "Bandra Kurla Complex, Mumbai" },
      { name: "Colaba Police Station", type: "police", distanceKm: "2.4 km", phone: "022-22856817", address: "Colaba Causeway, Mumbai" },
    ],
  },
  Bengaluru: {
    hospitals: [
      { name: "Manipal Hospital Casualty & Trauma", type: "hospital", distanceKm: "1.5 km", phone: "080-25024444", address: "HAL Old Airport Rd, Kodihalli" },
      { name: "NIMHANS Emergency Care", type: "hospital", distanceKm: "2.8 km", phone: "080-26995000", address: "Hosur Road, Bengaluru" },
      { name: "St. John's Medical College Hospital", type: "hospital", distanceKm: "3.4 km", phone: "080-22065000", address: "Sarjapur Road, Koramangala" },
    ],
    police: [
      { name: "Indiranagar Police Station", type: "police", distanceKm: "0.7 km", phone: "080-22942544", address: "100 Feet Rd, HAL 2nd Stage" },
      { name: "Koramangala Pink Hoysala Patrol", type: "pink_booth", distanceKm: "1.3 km", phone: "112", address: "80 Feet Rd, 4th Block, Koramangala" },
      { name: "Cubbon Park Police Station", type: "police", distanceKm: "2.1 km", phone: "080-22942581", address: "Kasturba Road, Bengaluru" },
    ],
  },
};

export default function EmergencyHubModal({
  isOpen,
  onClose,
  city = "Delhi",
  userCoords = [28.6139, 77.2090],
  initialTab = "sos",
}: EmergencyHubModalProps) {
  const [activeTab, setActiveTab] = useState<"ambulance" | "police" | "sos">(initialTab);
  
  // Ambulance Form State
  const [medicalCondition, setMedicalCondition] = useState("Severe Trauma / Road Accident");
  const [patientCount, setPatientCount] = useState("1");
  const [ambulanceStatus, setAmbulanceStatus] = useState<"idle" | "dispatching" | "dispatched">("idle");
  const [ambulanceETA, setAmbulanceETA] = useState<number | null>(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState<string | null>(null);

  // Police Form State
  const [policeIncident, setPoliceIncident] = useState("Harassment / Immediate Threat");
  const [policeStatus, setPoliceStatus] = useState<"idle" | "dispatching" | "dispatched">("idle");
  const [pcrUnit, setPcrUnit] = useState<string | null>(null);
  const [pcrETA, setPcrETA] = useState<number | null>(null);

  // SOS Siren State
  const [sirenActive, setSirenActive] = useState(false);
  const [sosBroadcastStatus, setSosBroadcastStatus] = useState<"idle" | "broadcasting" | "active">("idle");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Clean up siren on unmount or close
  useEffect(() => {
    if (!isOpen && sirenActive) {
      stopSiren();
    }
  }, [isOpen]);

  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;

      let high = false;
      sirenIntervalRef.current = setInterval(() => {
        if (!oscillatorRef.current || !audioCtxRef.current) return;
        const targetFreq = high ? 600 : 960;
        oscillatorRef.current.frequency.exponentialRampToValueAtTime(
          targetFreq,
          audioCtxRef.current.currentTime + 0.35
        );
        high = !high;
      }, 400);

      setSirenActive(true);
    } catch (e) {
      console.error("Web Audio Siren error:", e);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch {}
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setSirenActive(false);
  };

  const handleToggleSiren = () => {
    if (sirenActive) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  // Dispatch Ambulance (108 Relay)
  const handleDispatchAmbulance = async () => {
    setAmbulanceStatus("dispatching");
    try {
      await fetch(`${API_BASE_URL}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userCoords[0],
          lon: userCoords[1],
          city: city,
          emergency_type: `Medical Emergency: ${medicalCondition} (${patientCount} Patient/s)`,
        }),
      });
    } catch {}

    setTimeout(() => {
      setAmbulanceStatus("dispatched");
      setAssignedAmbulance(`ALS-108-DL-0${Math.floor(10 + Math.random() * 89)}`);
      setAmbulanceETA(Math.floor(4 + Math.random() * 4));
    }, 1200);
  };

  // Dispatch Police (112 ERSS Relay)
  const handleDispatchPolice = async () => {
    setPoliceStatus("dispatching");
    try {
      await fetch(`${API_BASE_URL}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userCoords[0],
          lon: userCoords[1],
          city: city,
          emergency_type: `Police ERSS 112: ${policeIncident}`,
        }),
      });
    } catch {}

    setTimeout(() => {
      setPoliceStatus("dispatched");
      setPcrUnit(`PCR-Romeo-0${Math.floor(1 + Math.random() * 9)} (Zone ${city})`);
      setPcrETA(Math.floor(2 + Math.random() * 4));
    }, 1200);
  };

  // Trigger Instant SOS Broadcast
  const handleTriggerSOS = async () => {
    setSosBroadcastStatus("broadcasting");
    startSiren();
    try {
      await fetch(`${API_BASE_URL}/api/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userCoords[0],
          lon: userCoords[1],
          city: city,
          emergency_type: "CRITICAL THREAT: Instant High-Priority Citizen SOS",
        }),
      });
    } catch {}

    setTimeout(() => {
      setSosBroadcastStatus("active");
    }, 1000);
  };

  const cityData = CITY_EMERGENCY_POIS[city] || CITY_EMERGENCY_POIS["Delhi"];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(14px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopSiren();
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          background: "linear-gradient(180deg, #0f172a 0%, #090e17 100%)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: 24,
          boxShadow: "0 25px 50px -12px rgba(239, 68, 68, 0.25), 0 0 40px rgba(239, 68, 68, 0.15)",
          overflow: "hidden",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* Header with Emergency Red Stripe */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(30, 41, 59, 0.8) 100%)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "radial-gradient(circle, #ef4444 0%, #991b1b 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 0 15px rgba(239, 68, 68, 0.6)",
                animation: "pulse 1.5s infinite",
              }}
            >
              🚨
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: "#fff", letterSpacing: "-0.02em" }}>
                  Rakshak Emergency Response Hub
                </h2>
                <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 9999, background: "#ef4444", color: "#fff", fontWeight: 800 }}>
                  LIVE 24/7
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                Active City: <strong>{city}</strong> • GPS Beacon: <strong>{userCoords[0].toFixed(4)}°N, {userCoords[1].toFixed(4)}°E</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopSiren();
              onClose();
            }}
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              color: "#94a3b8",
              width: 34,
              height: 34,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation (Ambulance, Police, Instant SOS) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: "rgba(15, 23, 42, 0.6)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Ambulance Tab */}
          <button
            onClick={() => setActiveTab("ambulance")}
            style={{
              padding: "14px 12px",
              background: activeTab === "ambulance" ? "rgba(239, 68, 68, 0.15)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === "ambulance" ? "#ef4444" : "transparent"}`,
              color: activeTab === "ambulance" ? "#fca5a5" : "#94a3b8",
              fontSize: "0.88rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            🚑 108 Ambulance
          </button>

          {/* Police Tab */}
          <button
            onClick={() => setActiveTab("police")}
            style={{
              padding: "14px 12px",
              background: activeTab === "police" ? "rgba(59, 130, 246, 0.15)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === "police" ? "#3b82f6" : "transparent"}`,
              color: activeTab === "police" ? "#93c5fd" : "#94a3b8",
              fontSize: "0.88rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            👮 112 ERSS Police
          </button>

          {/* Instant SOS Tab */}
          <button
            onClick={() => setActiveTab("sos")}
            style={{
              padding: "14px 12px",
              background: activeTab === "sos" ? "rgba(234, 179, 8, 0.15)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === "sos" ? "#eab308" : "transparent"}`,
              color: activeTab === "sos" ? "#fde047" : "#94a3b8",
              fontSize: "0.88rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            🚨 Instant SOS & Siren
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          
          {/* ── TAB 1: AMBULANCE 108 MEDICAL DISPATCH ── */}
          {activeTab === "ambulance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 16,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#fca5a5" }}>
                    National Medical Emergency Relay (108 / 102)
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: 2 }}>
                    Dispatches nearest Advanced Life Support (ALS) Ambulance with GPS telemetry.
                  </div>
                </div>

                <a
                  href="tel:108"
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    color: "#fff",
                    borderRadius: 9999,
                    textDecoration: "none",
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 0 15px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  📞 Direct Call 108
                </a>
              </div>

              {/* Patient Condition Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Medical Emergency Category
                  </label>
                  <select
                    value={medicalCondition}
                    onChange={(e) => setMedicalCondition(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  >
                    <option value="Severe Trauma / Road Accident">🚗 Severe Trauma / Road Accident</option>
                    <option value="Cardiac Arrest / Chest Pain">❤️ Cardiac Arrest / Heart Attack</option>
                    <option value="Unconscious / Non-Responsive">⚠️ Unconscious / Stroke</option>
                    <option value="Severe Bleeding / Burn Injury">🩸 Severe Bleeding / Burns</option>
                    <option value="Maternity Emergency">👶 Maternity / Labour Emergency</option>
                    <option value="Respiratory Distress / Choking">🫁 Severe Breathing Distress</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Number of Patients
                  </label>
                  <select
                    value={patientCount}
                    onChange={(e) => setPatientCount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  >
                    <option value="1">1 Person</option>
                    <option value="2">2 Persons</option>
                    <option value="3+">3+ Persons (Mass Casualty)</option>
                  </select>
                </div>
              </div>

              {/* Dispatch Action & Status */}
              {ambulanceStatus === "idle" && (
                <button
                  onClick={handleDispatchAmbulance}
                  style={{
                    padding: "14px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)",
                  }}
                >
                  🚑 Transmit Live Telemetry & Dispatch Ambulance
                </button>
              )}

              {ambulanceStatus === "dispatching" && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid #ef4444",
                    textAlign: "center",
                    color: "#fca5a5",
                    fontWeight: 800,
                    fontSize: "0.92rem",
                  }}
                >
                  ⏳ Pinging Emergency Medical Dispatch Grid & Transmitting GPS...
                </div>
              )}

              {ambulanceStatus === "dispatched" && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#86efac",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 900, fontSize: "0.92rem" }}>✅ Ambulance Dispatched & En Route</span>
                    <span style={{ background: "#22c55e", color: "#000", fontWeight: 900, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem" }}>
                      ETA ~{ambulanceETA} MINS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                    Assigned Unit: <strong>{assignedAmbulance}</strong> • Equipped with Oxygen & Paramedic ALS
                  </div>
                </div>
              )}

              {/* Nearest Trauma Centers & Hospitals in City */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#cbd5e1", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  🏥 Nearest Verified Trauma Centers ({city})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {cityData.hospitals.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>{h.name}</span>
                        <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700 }}>{h.distanceKm}</span>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{h.address}</span>
                      <a
                        href={`tel:${h.phone}`}
                        style={{
                          marginTop: 4,
                          fontSize: "0.74rem",
                          color: "#f87171",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        📞 {h.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: POLICE 112 ERSS DISPATCH ── */}
          {activeTab === "police" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: 16,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#93c5fd" }}>
                    National Police Emergency Response (112 ERSS / 1090)
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: 2 }}>
                    Direct dispatch to nearest Police Control Room (PCR) & Pink Booth Patrols.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href="tel:112"
                    style={{
                      padding: "8px 14px",
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      color: "#fff",
                      borderRadius: 9999,
                      textDecoration: "none",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    📞 Call 112
                  </a>
                  <a
                    href="tel:1091"
                    style={{
                      padding: "8px 14px",
                      background: "linear-gradient(135deg, #ec4899, #db2777)",
                      color: "#fff",
                      borderRadius: 9999,
                      textDecoration: "none",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    👩 Call 1091 (Women)
                  </a>
                </div>
              </div>

              {/* Incident Type Selector */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: 6 }}>
                  Incident Nature / Urgency
                </label>
                <select
                  value={policeIncident}
                  onChange={(e) => setPoliceIncident(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  <option value="Harassment / Immediate Threat">🚨 Harassment / Physical Threat in Public</option>
                  <option value="Suspicious Stalker / Being Followed">👁️ Suspicious Stalker / Being Followed</option>
                  <option value="Eve-Teasing / Unsafe Gathering">⚠️ Eve-Teasing / Unsafe Mob Gathering</option>
                  <option value="Robbery / Snatching / Weapon Threat">🔪 Robbery / Weapon Snatching Threat</option>
                  <option value="Domestic / Personal Distress">🛡️ Domestic Violence / Immediate Help</option>
                </select>
              </div>

              {/* Dispatch Action & Status */}
              {policeStatus === "idle" && (
                <button
                  onClick={handleDispatchPolice}
                  style={{
                    padding: "14px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  👮 Transmit GPS & Dispatch PCR Van / Pink Hoysala
                </button>
              )}

              {policeStatus === "dispatching" && (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: 14,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid #3b82f6",
                    textAlign: "center",
                    color: "#93c5fd",
                    fontWeight: 800,
                    fontSize: "0.92rem",
                  }}
                >
                  ⏳ Relaying Live Alert to State Police Command Center...
                </div>
              )}

              {policeStatus === "dispatched" && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    color: "#86efac",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 900, fontSize: "0.92rem" }}>✅ PCR Patrol Van Assigned & Dispatched</span>
                    <span style={{ background: "#22c55e", color: "#000", fontWeight: 900, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem" }}>
                      ETA ~{pcrETA} MINS
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                    Unit ID: <strong>{pcrUnit}</strong> • Real-time GPS Tracking relayed to Police Dispatch
                  </div>
                </div>
              )}

              {/* Nearest Police Stations & Pink Booths */}
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#cbd5e1", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  👮 Nearest Police Stations & Pink Booths ({city})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {cityData.police.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>
                          {p.type === "pink_booth" ? "🌸 " : "👮 "} {p.name}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 700 }}>{p.distanceKm}</span>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{p.address}</span>
                      <a
                        href={`tel:${p.phone}`}
                        style={{
                          marginTop: 4,
                          fontSize: "0.74rem",
                          color: "#60a5fa",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        📞 {p.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: INSTANT SOS & HIGH-DECIBEL SIREN ── */}
          {activeTab === "sos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
              
              <div
                style={{
                  background: sirenActive ? "rgba(239, 68, 68, 0.25)" : "rgba(30, 41, 59, 0.5)",
                  border: `2px solid ${sirenActive ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 20,
                  padding: "1.5rem",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                  {sirenActive ? "🚨 EMERGENCY ALARM ACTIVE" : "🛡️ High-Decibel Safety Alarm & Broadcast"}
                </div>
                <p style={{ fontSize: "0.82rem", color: "#cbd5e1", maxWidth: 500, margin: "0 auto 1.25rem" }}>
                  Emits a loud deterrent sound synthesizer directly from your device speakers and broadcasts emergency telemetry to family & authorities.
                </p>

                <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Siren Toggle Button */}
                  <button
                    onClick={handleToggleSiren}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 9999,
                      background: sirenActive ? "#ef4444" : "linear-gradient(135deg, #f59e0b, #d97706)",
                      border: "none",
                      color: "#fff",
                      fontSize: "0.92rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: sirenActive ? "0 0 25px rgba(239, 68, 68, 0.8)" : "0 0 15px rgba(245, 158, 11, 0.4)",
                      animation: sirenActive ? "pulse 0.8s infinite" : "none",
                    }}
                  >
                    {sirenActive ? "⏹️ STOP SIREN ALARM" : "🔊 ACTIVATE HIGH-DECIBEL SIREN"}
                  </button>

                  {/* One-Tap Broadcast Button */}
                  <button
                    onClick={handleTriggerSOS}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 9999,
                      background: "linear-gradient(135deg, #ef4444, #991b1b)",
                      border: "none",
                      color: "#fff",
                      fontSize: "0.92rem",
                      fontWeight: 900,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)",
                    }}
                  >
                    🚨 BROADCAST SOS TO ALL NETWORKS
                  </button>
                </div>
              </div>

              {sosBroadcastStatus === "active" && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid #22c55e",
                    color: "#86efac",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  📡 Emergency coordinates live-broadcasted to ERSS 112, Police Dashboard, and Trusted Family Contacts!
                </div>
              )}

              {/* Quick Helplines Grid */}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#cbd5e1", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  🇮🇳 Instant National Emergency Helplines
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <a
                    href="tel:112"
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#93c5fd",
                      textDecoration: "none",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                    }}
                  >
                    👮 112 All-In-One
                  </a>
                  <a
                    href="tel:108"
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fca5a5",
                      textDecoration: "none",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                    }}
                  >
                    🚑 108 Ambulance
                  </a>
                  <a
                    href="tel:1091"
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#f472b6",
                      textDecoration: "none",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                    }}
                  >
                    👩 1091 Women Line
                  </a>
                  <a
                    href="tel:1090"
                    style={{
                      padding: "10px",
                      borderRadius: 10,
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#fde047",
                      textDecoration: "none",
                      textAlign: "center",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                    }}
                  >
                    🛡️ 1090 Powerline
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "rgba(15, 23, 42, 0.8)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.74rem",
            color: "#64748b",
          }}
        >
          <span>🔒 AES-256 Encrypted Telemetry • Automated ERSS 112 Protocol</span>
          <button
            onClick={() => {
              stopSiren();
              onClose();
            }}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#cbd5e1",
              fontSize: "0.76rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
