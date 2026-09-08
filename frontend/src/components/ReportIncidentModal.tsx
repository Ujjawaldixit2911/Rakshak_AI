"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import VoiceInputButton from "./VoiceInputButton";

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: string;
  initialLat?: number;
  initialLon?: number;
}

export default function ReportIncidentModal({
  isOpen,
  onClose,
  city,
  initialLat,
  initialLon,
}: ReportIncidentModalProps) {
  const [lat, setLat] = useState(initialLat || 28.6315);
  const [lon, setLon] = useState(initialLon || 77.2167);
  const [locationName, setLocationName] = useState("");
  const [crimeType, setCrimeType] = useState("Harassment");
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          location_name: locationName || "Reported Location",
          lat: Number(lat),
          lon: Number(lon),
          crime_type: crimeType,
          description: description || "Community incident reported via citizen portal.",
          severity: Number(severity),
          reporter_id: 3,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1800);
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "#0f172a",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "480px",
        padding: "1.75rem",
        boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
        color: "#f8fafc"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc" }}>
              📢 Report Safety Concern
            </h2>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Feeds directly into Police Command Moderation Queue ({city})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✅</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#22c55e" }}>Report Submitted Successfully</h3>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "6px" }}>
              Your report has been logged and queued for officer verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-dark"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-dark"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Area / Landmark Name</label>
                <VoiceInputButton
                  size="sm"
                  title="Speak location name with Whisper"
                  onResult={(text) => setLocationName(text)}
                />
              </div>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g. Near Metro Gate 3, Connaught Place"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Concern / Incident Type</label>
                <select
                  className="input-dark"
                  value={crimeType}
                  onChange={(e) => setCrimeType(e.target.value)}
                  style={{ background: "#1e293b", color: "#f8fafc" }}
                >
                  <option value="Harassment">Harassment / Eve Teasing</option>
                  <option value="Poor Lighting">Poor Street Lighting</option>
                  <option value="Stalking">Stalking / Suspicious Following</option>
                  <option value="Snatching">Snatching / Theft</option>
                  <option value="Isolated Stretch">Isolated / Deserted Stretch</option>
                  <option value="Broken CCTV">Broken Surveillance Camera</option>
                  <option value="Other">Other Safety Hazard</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Severity (1–10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="input-dark"
                  value={severity}
                  onChange={(e) => setSeverity(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>Description & Details</label>
                <VoiceInputButton
                  size="sm"
                  title="Dictate incident details with Whisper"
                  onResult={(text) => setDescription((prev) => (prev ? `${prev} ${text}` : text))}
                />
              </div>
              <textarea
                className="input-dark"
                rows={3}
                placeholder="Describe what occurred, time observed, or specific hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: "8px", padding: "0.8rem", background: "#ef4444" }}
            >
              {loading ? "Submitting..." : "🚀 Submit Community Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
