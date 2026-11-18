"use client";

import React, { useState, useEffect, useRef } from "react";

interface HeroAvatarPresenterProps {
  onExploreMap?: () => void;
  onOpenCopilot?: () => void;
}

export default function HeroAvatarPresenter({
  onExploreMap,
  onOpenCopilot,
}: HeroAvatarPresenterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const englishDialogue = [
    "Hello! I am your Rakshak Safety Guide.",
    "Standard navigation apps only focus on the shortest or fastest path, even if it takes you through dark and risky alleys.",
    "Rakshak analyzes real crime hotspots, street lighting, and police patrolling to compute the safest possible route.",
    "Even if it takes 2 minutes more, we ensure you always reach your destination safely and securely.",
    "Now you can explore the live safety platform. Let's get started!"
  ];

  const activeDialogue = englishDialogue;

  // Speak function with natural human-like speech modulation
  const startSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setCurrentCaptionIndex(0);

    const fullSpeechText = activeDialogue.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
    utteranceRef.current = utterance;

    // Natural human voice preference (English)
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => (v.lang === "en-IN" || v.lang.includes("India")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Rishi") || v.name.includes("Prabhat"))) ||
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("en-US") || v.lang.startsWith("en-GB") || v.lang.startsWith("en"));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    // Natural human cadence settings (not robotic)
    utterance.lang = "en-IN";
    utterance.rate = 0.92; // slightly slower natural speaking pace
    utterance.pitch = 1.02; // natural warm tone

    // Caption timeline simulation
    const intervalTime = (fullSpeechText.length * 55) / activeDialogue.length;
    let captionStep = 0;
    const interval = setInterval(() => {
      captionStep++;
      if (captionStep < activeDialogue.length) {
        setCurrentCaptionIndex(captionStep);
      } else {
        clearInterval(interval);
      }
    }, intervalTime);

    utterance.onend = () => {
      setIsPlaying(false);
      clearInterval(interval);
      setCurrentCaptionIndex(activeDialogue.length - 1);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      clearInterval(interval);
    };

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  // Preload voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "24px",
        padding: "2rem",
        marginBottom: "2rem",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
      }}
    >
      {/* Decorative ambient lighting */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "20%",
          width: "350px",
          height: "350px",
          background: "radial-gradient(circle, var(--mesh-blob-1) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-60px",
          right: "10%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, var(--mesh-blob-2) 0%, transparent 70%)",
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 340px) 1fr",
          gap: "2.5rem",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Left Column: Full Avatar Stage */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Avatar Glass Stage Frame */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "320px",
              height: "420px",
              borderRadius: "20px",
              overflow: "hidden",
              border: isPlaying ? "2.5px solid var(--accent-primary)" : "2px solid var(--border-subtle)",
              boxShadow: isPlaying
                ? "0 0 25px var(--accent-glow), var(--shadow-card-hover)"
                : "var(--shadow-card)",
              background: "var(--bg-card-hover)",
              transition: "all 0.3s ease",
            }}
          >
            <img
              src="/assets/presenter_character.jpg"
              alt="Rakshak Safety Guide"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
                transform: isPlaying ? "scale(1.02)" : "scale(1)",
                transition: "transform 0.4s ease",
              }}
            />

            {/* Live Speaking Badge Overlay */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "14px",
                padding: "4px 12px",
                borderRadius: "20px",
                background: isPlaying ? "var(--accent-primary)" : "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                backdropFilter: "blur(8px)",
                color: isPlaying ? "#fff" : "var(--text-primary)",
                fontSize: "0.74rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isPlaying ? "#fff" : "var(--accent-primary)",
                  animation: isPlaying ? "pulse 1.2s infinite" : "none",
                }}
              />
              <span>{isPlaying ? "🎙️ SPEAKING LIVE" : "🛡️ SAFETY GUIDE"}</span>
            </div>

            {/* Audio Waveform Animation when playing */}
            {isPlaying && (
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: "var(--bg-card)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ width: 3, height: 16, background: "var(--accent-primary)", borderRadius: 2, animation: "wave 0.8s infinite" }} />
                <div style={{ width: 3, height: 24, background: "#34d399", borderRadius: 2, animation: "wave 0.6s infinite 0.1s" }} />
                <div style={{ width: 3, height: 12, background: "var(--accent-primary)", borderRadius: 2, animation: "wave 0.9s infinite 0.2s" }} />
                <div style={{ width: 3, height: 20, background: "#6ee7b7", borderRadius: 2, animation: "wave 0.7s infinite 0.15s" }} />
                <div style={{ width: 3, height: 14, background: "var(--accent-primary)", borderRadius: 2, animation: "wave 0.85s infinite 0.05s" }} />
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, marginLeft: 4 }}>
                  Voice Briefing
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Speech Bubble & Mission Controls */}
        <div>
          {/* Top Tag & Language Selector */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "var(--accent-subtle)",
                  color: "var(--accent-primary)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  border: "1px solid rgba(5, 150, 105, 0.25)",
                }}
              >
                🛡️ RAKSHAK PUBLIC SAFETY NETWORK
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                "Navigate Smart. Stay Safe."
              </span>
            </div>

            {/* Audio Indicator */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-card-hover)",
                borderRadius: 8,
                padding: "4px 10px",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              <span>🔊 English Audio</span>
            </div>
          </div>

          {/* Main Speech Bubble Card */}
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "18px",
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border-subtle)",
              backdropFilter: "blur(12px)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>💬</span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Message from Safety Guide:
              </h3>
            </div>

            {/* Speech Teleprompter Highlight */}
            <div
              style={{
                fontSize: "1.05rem",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                fontWeight: 500,
                minHeight: "80px",
              }}
            >
              <p style={{ margin: "0 0 10px 0" }}>
                <strong style={{ color: "var(--accent-primary)" }}>"</strong>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                  {activeDialogue[currentCaptionIndex] || activeDialogue[0]}
                </span>
                <strong style={{ color: "var(--accent-primary)" }}>"</strong>
              </p>
            </div>

            {/* Core Philosophy Bullet Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "10px",
                background: "var(--accent-subtle)",
                border: "1px solid rgba(5, 150, 105, 0.2)",
              }}>
                <span style={{ fontSize: "1.1rem" }}>⏱️</span>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--accent-primary)", display: "block" }}>Fastest vs Safest</strong> Low-risk, well-lit verified corridor prioritization.
                </div>
              </div>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}>
                <span style={{ fontSize: "1.1rem" }}>💡</span>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#d97706", display: "block" }}>Street Illumination</strong> Bypasses unlit and isolated blindspots.
                </div>
              </div>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "8px 10px",
                borderRadius: "10px",
                background: "rgba(37, 99, 235, 0.08)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
              }}>
                <span style={{ fontSize: "1.1rem" }}>👮</span>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#2563eb", display: "block" }}>Police & CCTV Patrol</strong> Verified 24x7 patrolled avenues.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (Voice Play, Explore Map, Open Copilot) */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            {/* Primary Voice Narration Button */}
            <button
              onClick={isPlaying ? stopSpeech : startSpeech}
              style={{
                padding: "12px 22px",
                borderRadius: "12px",
                background: isPlaying
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, #059669, #047857)",
                border: "none",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.92rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: isPlaying
                  ? "0 6px 20px rgba(239, 68, 68, 0.4)"
                  : "0 6px 20px rgba(5, 150, 105, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <span>{isPlaying ? "⏹️ Stop Audio" : "🔊 Listen to Safety Guide"}</span>
            </button>

            {/* Explore Safe Navigation Button */}
            {onExploreMap && (
              <button
                onClick={onExploreMap}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "var(--accent-subtle)",
                  border: "1px solid rgba(5, 150, 105, 0.3)",
                  color: "var(--accent-primary)",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <span>🗺️ Explore Safe Routes</span>
              </button>
            )}

            {/* Talk with Assistant Button */}
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <span>🛡️ Open Safety Assistant</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
