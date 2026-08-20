"use client";

import { useState } from "react";

export default function SOSButton() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleSOS = async () => {
    setStatus("sending");
    
    // Attempt to get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await sendSOS(position.coords.latitude, position.coords.longitude);
        },
        async () => {
          // Fallback to a default location if denied
          await sendSOS(28.6129, 77.2295); 
        }
      );
    } else {
      await sendSOS(28.6129, 77.2295);
    }
  };

  const sendSOS = async (lat: number, lng: number) => {
    try {
      await fetch("http://localhost:8000/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng })
      });
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 3000); // Reset after 3s
    } catch (error) {
      console.error("SOS failed", error);
      setStatus("idle");
    }
  };

  return (
    <button
      onClick={handleSOS}
      disabled={status !== "idle"}
      className={`fixed bottom-6 right-6 z-[9999] w-20 h-20 rounded-full shadow-2xl flex items-center justify-center text-white font-black text-2xl transition-all duration-300 ${
        status === "idle" 
          ? "bg-red-600 hover:bg-red-700 hover:scale-110 shadow-red-500/50 animate-bounce" 
          : status === "sending"
          ? "bg-orange-500 animate-pulse"
          : "bg-green-600"
      }`}
    >
      {status === "idle" ? "SOS" : status === "sending" ? "..." : "✓"}
    </button>
  );
}
