"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface VoiceIntroState {
  isPlaying: boolean;
  isMuted: boolean;
  isBlocked: boolean;
  isSupported: boolean;
  hasPlayedInSession: boolean;
  play: () => void;
  pause: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  skip: () => void;
}

export const INTRO_SCRIPT =
  "Welcome to Rakshak AI — your intelligent safety companion for everyday travel. We analyze real crime data and route conditions to help you choose the fastest, safest, or most balanced path to your destination. Whether you're a citizen, a working professional, part of an ambulance crew, or with the police, Rakshak is built to keep you informed and protected. Let's get started — sign in to continue.";

const SESSION_KEY = "rakshak_voice_intro_played";

export function useVoiceIntro(autoStart = true): VoiceIntroState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPlayedInSession, setHasPlayedInSession] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize session flag check and prepare utterance
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setIsSupported(supported);

    if (!supported) return;

    const played = sessionStorage.getItem(SESSION_KEY) === "true";
    setHasPlayedInSession(played);

    const utterance = new SpeechSynthesisUtterance(INTRO_SCRIPT);
    utterance.rate = 1.0;
    utterance.pitch = 1.02;
    utterance.lang = "en-US";

    // Set voice once voices are loaded if available
    const setPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Daniel") ||
            v.name.includes("Alex")) &&
          v.lang.startsWith("en")
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferred) {
        utterance.voice = preferred;
      }
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setPreferredVoice;
    }
    setPreferredVoice();

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsBlocked(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "true");
        setHasPlayedInSession(true);
      } catch (e) {
        console.warn("Session storage unavailable", e);
      }
    };

    utterance.onerror = (e) => {
      setIsPlaying(false);
      if (e.error === "not-allowed" || e.error === "audio-busy") {
        setIsBlocked(true);
      }
    };

    utteranceRef.current = utterance;

    // Trigger auto-play on initial mount if not yet played this session
    if (autoStart && !played) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        
        // Timeout check: If speech didn't start playing within 400ms, it may be blocked by autoplay policy
        const timer = setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            setIsBlocked(true);
          }
        }, 400);

        return () => clearTimeout(timer);
      } catch {
        setIsBlocked(true);
      }
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [autoStart]);

  const play = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (utteranceRef.current) {
        window.speechSynthesis.speak(utteranceRef.current);
        setIsBlocked(false);
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn("Failed to trigger speech:", e);
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const mute = useCallback(() => {
    setIsMuted(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, []);

  const unmute = useCallback(() => {
    setIsMuted(false);
    play();
  }, [play]);

  const toggleMute = useCallback(() => {
    if (isPlaying || !isMuted) {
      mute();
    } else {
      unmute();
    }
  }, [isPlaying, isMuted, mute, unmute]);

  const skip = useCallback(() => {
    pause();
    setIsBlocked(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
      setHasPlayedInSession(true);
    } catch (e) {
      console.warn(e);
    }
  }, [pause]);

  return {
    isPlaying,
    isMuted,
    isBlocked,
    isSupported,
    hasPlayedInSession,
    play,
    pause,
    mute,
    unmute,
    toggleMute,
    skip,
  };
}

export default useVoiceIntro;
