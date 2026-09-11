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
  const [language, setLanguage] = useState<"hindi" | "english">("hindi");
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hindiDialogue = [
    "Namaste! Main hoon aapka Rakshak AI Safety Navigator.",
    "Conventional maps aapko sirf sabse chhota ya fastest rasta dikhate hain, chahe wo kitna bhi sunsaan ya khatarnak kyu na ho.",
    "Lekin Rakshak AI par hum real-time crime incidents, unlit blindspots, aur accident zones ko bypass karte hain.",
    "Chahe do minute extra lagein, par hum aapko sabse safe aur fully illuminated route provide karenge!",
    "Now you can login, aur uske next step me hum Firebase connect karenge. Chaliye shuru karte hain!"
  ];

  const englishDialogue = [
    "Hello! I am your Rakshak AI Safety Navigator.",
    "Standard navigation apps only focus on the shortest or fastest path, even if it takes you through dark and risky alleys.",
    "Rakshak AI analyzes real crime hotspots, street lighting, and police patrolling to compute the safest possible route.",
    "Even if it takes 2 minutes more, we ensure you always reach your destination safely and securely.",
    "Now you can log in, and in the next step we will connect Firebase authentication and live database. Let's get started!"
  ];

  const activeDialogue = language === "hindi" ? hindiDialogue : englishDialogue;

  // Speak function with natural human-like speech modulation
  const startSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setCurrentCaptionIndex(0);

    const fullSpeechText = activeDialogue.join(" ");
    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
    utteranceRef.current = utterance;

    // Natural Indian human voice preference
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => (v.lang === "hi-IN" || v.lang === "hi_IN") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("India"))) ||
      voices.find((v) => v.lang.startsWith("hi")) ||
      voices.find((v) => (v.lang === "en-IN" || v.lang.includes("India")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Rishi") || v.name.includes("Prabhat"))) ||
      voices.find((v) => v.lang.startsWith("en-IN")) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    // Natural human cadence settings (not robotic)
    utterance.lang = language === "hindi" ? "hi-IN" : "en-IN";
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
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 24, 41, 0.98) 50%, rgba(8, 15, 29, 1) 100%)",
        border: "1px solid rgba(79, 124, 255, 0.35)",
        borderRadius: "24px",
        padding: "2rem",
        marginBottom: "2rem",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.15)",
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
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)",
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
              border: isPlaying ? "2px solid #38bdf8" : "2px solid rgba(79, 124, 255, 0.4)",
              boxShadow: isPlaying
                ? "0 0 35px rgba(56, 189, 248, 0.5), 0 15px 30px rgba(0, 0, 0, 0.7)"
                : "0 15px 35px rgba(0, 0, 0, 0.6)",
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)",
              transition: "all 0.3s ease",
            }}
          >
            <img
              src="/assets/presenter_character.jpg"
              alt="Rakshak AI Safety Presenter"
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
                background: isPlaying ? "rgba(16, 185, 129, 0.9)" : "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                fontSize: "0.74rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isPlaying ? "#fff" : "#38bdf8",
                  animation: isPlaying ? "pulse 1.2s infinite" : "none",
                }}
              />
              <span>{isPlaying ? "🎙️ SPEAKING LIVE" : "👤 AI SAFETY GUIDE"}</span>
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
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                }}
              >
                <div style={{ width: 3, height: 16, background: "#38bdf8", borderRadius: 2, animation: "wave 0.8s infinite" }} />
                <div style={{ width: 3, height: 24, background: "#818cf8", borderRadius: 2, animation: "wave 0.6s infinite 0.1s" }} />
                <div style={{ width: 3, height: 12, background: "#38bdf8", borderRadius: 2, animation: "wave 0.9s infinite 0.2s" }} />
                <div style={{ width: 3, height: 20, background: "#c084fc", borderRadius: 2, animation: "wave 0.7s infinite 0.15s" }} />
                <div style={{ width: 3, height: 14, background: "#38bdf8", borderRadius: 2, animation: "wave 0.85s infinite 0.05s" }} />
                <span style={{ fontSize: "0.72rem", color: "#e2e8f0", fontWeight: 700, marginLeft: 4 }}>
                  Human Voice Active
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
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                }}
              >
                🛡️ RAKSHAK AI PLATFORM MISSION
              </span>
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                "Navigate Smart. Stay Safe."
              </span>
            </div>

            {/* Language Switcher */}
            <div
              style={{
                display: "flex",
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: 10,
                padding: 3,
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <button
                onClick={() => {
                  stopSpeech();
                  setLanguage("hindi");
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: language === "hindi" ? "#3b82f6" : "transparent",
                  color: language === "hindi" ? "#fff" : "#94a3b8",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🇮🇳 हिंदी
              </button>
              <button
                onClick={() => {
                  stopSpeech();
                  setLanguage("english");
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: language === "english" ? "#3b82f6" : "transparent",
                  color: language === "english" ? "#fff" : "#94a3b8",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Main Speech Bubble Card */}
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "18px",
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: "1.2rem" }}>💬</span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                {language === "hindi" ? "Safety Navigator ka Sandesh:" : "Message from Safety Navigator:"}
              </h3>
            </div>

            {/* Speech Teleprompter Highlight */}
            <div
              style={{
                fontSize: "1.05rem",
                color: "#f1f5f9",
                lineHeight: 1.6,
                fontWeight: 500,
                minHeight: "80px",
              }}
            >
              <p style={{ margin: "0 0 10px 0" }}>
                <strong style={{ color: "#38bdf8" }}>"</strong>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                  {activeDialogue[currentCaptionIndex] || activeDialogue[0]}
                </span>
                <strong style={{ color: "#38bdf8" }}>"</strong>
              </p>
            </div>

            {/* Core Philosophy Bullet Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>⏱️</span>
                <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                  <strong style={{ color: "#f8fafc" }}>Fastest vs Safest:</strong> Shortest route nahi, balki low-crime corridor guarantee.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>💡</span>
                <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                  <strong style={{ color: "#f8fafc" }}>Street Illumination:</strong> Unlit aur isolated blindspots ko 100% bypass.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: "1.1rem" }}>👮</span>
                <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                  <strong style={{ color: "#f8fafc" }}>Police & CCTV Patrol:</strong> 24x7 monitored arterial highways priority.
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
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.92rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: isPlaying
                  ? "0 6px 20px rgba(239, 68, 68, 0.4)"
                  : "0 6px 20px rgba(59, 130, 246, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              <span>{isPlaying ? "⏹️ Stop Audio" : "🔊 Listen to Avatar (Human Voice)"}</span>
            </button>

            {/* Explore Safe Navigation Button */}
            {onExploreMap && (
              <button
                onClick={onExploreMap}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "#4ade80",
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

            {/* Talk with AI Copilot Button */}
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🤖 Ask AI Copilot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
