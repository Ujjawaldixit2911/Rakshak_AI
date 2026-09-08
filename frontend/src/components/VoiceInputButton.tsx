"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  title?: string;
  size?: "sm" | "md" | "lg";
}

export default function VoiceInputButton({
  onResult,
  title = "Speak to fill input with Whisper",
  size = "md",
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoiceInput = async () => {
    // 1. Try Browser SpeechRecognition first for instantaneous response
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN"; // Supports Indian English & Hindi accent
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onResult(transcript);
          }
          setIsRecording(false);
        };

        recognition.onerror = () => {
          // Fallback to Whisper MediaRecorder if SpeechRecognition has errors
          startWhisperRecording();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition failed, using Whisper fallback", err);
      }
    }

    // 2. Fallback to MediaRecorder + Groq Whisper Backend API
    startWhisperRecording();
  };

  const startWhisperRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const res = await api.transcribeAudio(audioBlob);
          if (res.text) {
            onResult(res.text);
          }
        } catch (err) {
          console.error("Whisper transcription failed:", err);
        } finally {
          setIsProcessing(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto stop after 6 seconds if user doesn't stop
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 6000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const btnPadding = size === "sm" ? "6px 9px" : size === "lg" ? "10px 14px" : "8px 12px";
  const iconSize = size === "sm" ? "14px" : size === "lg" ? "18px" : "16px";

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startVoiceInput}
      disabled={isProcessing}
      title={isRecording ? "Listening... click to stop" : title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: btnPadding,
        background: isRecording
          ? "rgba(239, 68, 68, 0.25)"
          : isProcessing
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(255, 255, 255, 0.07)",
        color: isRecording ? "#f87171" : isProcessing ? "#60a5fa" : "#94a3b8",
        border: `1px solid ${
          isRecording
            ? "rgba(239, 68, 68, 0.6)"
            : isProcessing
            ? "rgba(59, 130, 246, 0.5)"
            : "rgba(255, 255, 255, 0.12)"
        }`,
        borderRadius: "8px",
        cursor: isProcessing ? "wait" : "pointer",
        transition: "all 0.2s ease",
        outline: "none",
        animation: isRecording ? "pulse 1.4s infinite" : "none",
      }}
    >
      {isProcessing ? (
        <span style={{ fontSize: iconSize }}>⏳</span>
      ) : isRecording ? (
        <span style={{ fontSize: iconSize }}>🔴</span>
      ) : (
        <svg
          style={{ width: iconSize, height: iconSize }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      )}
      {isRecording && <span style={{ fontSize: "11px", fontWeight: 600 }}>Listening...</span>}
    </button>
  );
}
