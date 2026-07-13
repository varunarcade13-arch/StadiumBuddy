import { useState, useRef, useCallback } from "react";
import type { SupportedLanguage } from "@/types/chat.types";

// ─── Web Speech API Types ────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function announce(message: string, urgent = false): void {
  if (typeof document === "undefined") return;
  const id = urgent ? "emergency-announcer" : "global-announcer";
  const el = document.getElementById(id);
  if (el) {
    el.textContent = "";
    setTimeout(() => { el.textContent = message; }, 10);
  }
}

export function useSpeechRecognition(language: SupportedLanguage) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(
    (onResult: (text: string) => void, onError?: (err: string) => void) => {
      const globalWin = typeof window !== "undefined" ? (window as any) : null;
      const SpeechRecognitionAPI =
        globalWin && (globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition);

      if (!SpeechRecognitionAPI) {
        onError?.("Voice input not supported in this browser. Please use Chrome or Edge.");
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript ?? "";
        onResult(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        onError?.(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      announce("Voice input activated. Speak now.");
    },
    [language]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}
