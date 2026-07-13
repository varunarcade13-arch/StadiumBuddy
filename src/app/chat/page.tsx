"use client";

// ─── AI Chat Page ──────────────────────────────────────────────────────────────
// Client Component: manages streaming chat state, voice I/O, multilingual support

import { useState, useRef, useEffect, useCallback, useId, memo } from "react";
import type { ChatMessage, SupportedLanguage, UserPreferences } from "@/types/chat.types";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
import { VENUES } from "@/lib/constants/venues";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";

// ─── Inline SVG Icons (Lucide-style, no library needed) ──────────────────────
function Icon({ d, size = 20, stroke = "currentColor", ...props }: {
  d: string | readonly string[]; size?: number; stroke?: string;
  className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      {...props}>
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

const ICONS = {
  stadium:    ["M3 9h18M3 15h18", "M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"],
  pin:        ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z", "M12 10a3 3 0 100-6 3 3 0 000 6z"],
  user:       ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8z"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  arrowLeft:  ["M19 12H5M12 19l-7-7 7-7"],
  mic:        ["M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z", "M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"],
  micOff:     ["M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6", "M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"],
  send:       ["M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"],
  stop:       ["M3 3h18v18H3z"],
  wheelchair: ["M12 4a2 2 0 100-4 2 2 0 000 4z", "M9 13a4 4 0 004 4h2a4 4 0 004-4v-4h-8v4z"],
  volume2:    ["M11 5L6 9H2v6h4l5 4V5z", "M15.54 8.46a5 5 0 010 7.07"],
  volumeX:    ["M11 5L6 9H2v6h4l5 4V5z", "M23 9l-6 6M17 9l6 6"],
} as const;


// ─── Web Speech API Types (not always in lib.dom.d.ts) ───────────────────────
declare global {
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
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreamingState {
  isStreaming: boolean;
  partialContent: string;
}

// ─── Utility: Generate ID ──────────────────────────────────────────────────────
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Utility: Announce to screen reader ───────────────────────────────────────
function announce(message: string, urgent = false): void {
  const id = urgent ? "emergency-announcer" : "global-announcer";
  const el = document.getElementById(id);
  if (el) {
    el.textContent = "";
    // Force re-announcement with setTimeout
    setTimeout(() => { el.textContent = message; }, 10);
  }
}

// ─── Voice Output Hook ────────────────────────────────────────────────────────
function useTTS() {
  const speak = useCallback((text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}

// ─── Voice Input Hook ─────────────────────────────────────────────────────────
function useSTT(language: SupportedLanguage) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(
    (onResult: (text: string) => void, onError?: (err: string) => void) => {
      const SpeechRecognitionAPI =
        (typeof window !== "undefined" &&
          (window.SpeechRecognition ?? window.webkitSpeechRecognition)) ||
        null;

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
      recognition.onend = () => setIsListening(false);

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

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [streaming, setStreaming] = useState<StreamingState>({ isStreaming: false, partialContent: "" });
  const [sessionId] = useState(() => generateUUID());
  const [mounted, setMounted] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState("metlife");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [userPrefs, _setUserPrefs] = useState<UserPreferences>({
    mobilityAssistanceNeeded: false,
    preferredTransport: null,
    dietaryRestrictions: [],
    language: "en",
    seatingZone: null,
  });
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatId = useId();

  const { speak, stop } = useTTS();
  const { isListening, startListening, stopListening } = useSTT(language);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming.partialContent]);

  // Welcome message on mount and whenever language changes
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update welcome message when language changes
  useEffect(() => {
    if (!mounted) return;
    const WELCOME_MESSAGES: Record<string, string> = {
      en: "👋 Welcome to StadiumBuddy! I'm your AI companion for the **FIFA World Cup 2026**.\n\nI can help you with:\n• 🗺️ Stadium navigation & directions\n• 🚇 Transport planning\n• 🍔 Food & beverage locations\n• ♿ Accessibility assistance\n• 🚨 Safety & emergency info\n• 🌍 Answers in 10 languages\n\nWhat would you like to know?",
      es: "👋 ¡Bienvenido a StadiumBuddy! Soy tu asistente de IA para la **Copa Mundial de la FIFA 2026**.\n\nPuedo ayudarte con:\n• 🗺️ Navegación y direcciones dentro del estadio\n• 🚇 Planificación de transporte\n• 🍔 Ubicaciones de comida y bebida\n• ♿ Asistencia de accesibilidad\n• 🚨 Información de seguridad y emergencias\n• 🌍 Respuestas en 10 idiomas\n\n¿En qué puedo ayudarte?",
      fr: "👋 Bienvenue sur StadiumBuddy ! Je suis votre assistant IA pour la **Coupe du Monde FIFA 2026**.\n\nJe peux vous aider avec :\n• 🗺️ Navigation et directions dans le stade\n• 🚇 Planification des transports\n• 🍔 Emplacements des restaurants et boissons\n• ♿ Assistance d'accessibilité\n• 🚨 Informations de sécurité et d'urgence\n• 🌍 Réponses en 10 langues\n\nQue souhaitez-vous savoir ?",
      ar: "👋 مرحباً بك في StadiumBuddy! أنا مساعدك بالذكاء الاصطناعي لـ **كأس العالم FIFA 2026**.\n\nيمكنني مساعدتك في:\n• 🗺️ التنقل والاتجاهات داخل الملعب\n• 🚇 تخطيط وسائل النقل\n• 🍔 أماكن الطعام والمشروبات\n• ♿ المساعدة في إمكانية الوصول\n• 🚨 معلومات الأمان والطوارئ\n• 🌍 إجابات بـ 10 لغات\n\nماذا تريد أن تعرف?",
      pt: "👋 Bem-vindo ao StadiumBuddy! Sou seu assistente de IA para a **Copa do Mundo FIFA 2026**.\n\nPosso ajudá-lo com:\n• 🗺️ Navegação e orientações no estádio\n• 🚇 Planejamento de transporte\n• 🍔 Locais de comida e bebida\n• ♿ Assistência de acessibilidade\n• 🚨 Informações de segurança e emergência\n• 🌍 Respostas em 10 idiomas\n\nO que você gostaria de saber?",
      de: "👋 Willkommen bei StadiumBuddy! Ich bin Ihr KI-Assistent für die **FIFA Weltmeisterschaft 2026**.\n\nIch kann Ihnen helfen mit:\n• 🗺️ Navigation und Wegbeschreibungen im Stadion\n• 🚇 Transportplanung\n• 🍔 Speisen- und Getränkestandorte\n• ♿ Barrierefreiheitshilfe\n• 🚨 Sicherheits- und Notfallinformationen\n• 🌍 Antworten in 10 Sprachen\n\nWas möchten Sie wissen?",
      zh: "👋 欢迎使用 StadiumBuddy！我是您的 **2026年FIFA世界杯** AI助手。\n\n我可以帮助您：\n• 🗺️ 体育场内导航和方向\n• 🚇 交通规划\n• 🍔 餐饮位置\n• ♿ 无障碍协助\n• 🚨 安全和紧急信息\n• 🌍 用10种语言回答\n\n您想了解什么？",
      hi: "👋 StadiumBuddy में आपका स्वागत है! मैं **FIFA विश्व कप 2026** के लिए आपका AI सहायक हूं।\n\nमैं आपकी मदद कर सकता हूं:\n• 🗺️ स्टेडियम नेविगेशन और दिशा-निर्देश\n• 🚇 परिवहन योजना\n• 🍔 खाना और पेय स्थान\n• ♿ पहुंच सहायता\n• 🚨 सुरक्षा और आपातकालीन जानकारी\n• 🌍 10 भाषाओं में उत्तर\n\nआप क्या जानना चाहते हैं?",
      ja: "👋 StadiumBuddyへようこそ！**FIFA ワールドカップ 2026** のAIアシスタントです。\n\nお手伝いできること：\n• 🗺️ スタジアム内のナビゲーションと道案内\n• 🚇 交通手段の計画\n• 🍔 食事・飲み物の場所\n• ♿ アクセシビリティ支援\n• 🚨 安全・緊急情報\n• 🌍 10言語での回答\n\n何が知りたいですか？",
      ko: "👋 StadiumBuddy에 오신 것을 환영합니다! **FIFA 월드컵 2026**을 위한 AI 어시스턴트입니다.\n\n도움을 드릴 수 있는 것:\n• 🗺️ 경기장 내 길 안내\n• 🚇 교통 계획\n• 🍔 음식 및 음료 위치\n• ♿ 접근성 지원\n• 🚨 안전 및 비상 정보\n• 🌍 10개 언어로 답변\n\n무엇을 알고 싶으신가요?",
    };
    const welcomeContent = WELCOME_MESSAGES[language] ?? WELCOME_MESSAGES["en"]!;
    const welcome: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: welcomeContent,
      timestamp: new Date(),
      language,
      confidence: "high",
    };
    // Only update if still showing just the welcome message (don't clobber a live conversation)
    setMessages((prev) => {
      const nonWelcome = prev.filter((m) => m.id !== "welcome");
      return [welcome, ...nonWelcome];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, mounted]);

  // ─── Send Message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming.isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
        language,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setStreaming({ isStreaming: true, partialContent: "" });
      announce("Sending message to AI assistant");

      // Build compact history (last 20 pairs for token efficiency)
      const historyPairs = messages.slice(-20).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [m.content],
      }));

      try {
        const response = await fetch(ROUTES.API.CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId,
            venueId: selectedVenueId,
            language,
            history: historyPairs,
            userPreferences: { ...userPrefs, language },
          }),
        });

        if (!response.ok) {
          const err = await response.json() as { error?: string; reason?: string };
          throw new Error(err.reason ?? err.error ?? "Request failed");
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let confidence: ChatMessage["confidence"] = "high";
        let sources: string[] = [];
        let msgId = generateId();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            if (!jsonStr) continue;

            try {
              const chunk = JSON.parse(jsonStr) as {
                type: string;
                content?: string;
                messageId?: string;
                confidence?: ChatMessage["confidence"];
                sources?: string[];
                error?: string;
              };

              if (chunk.type === "delta" && chunk.content) {
                accumulated += chunk.content;
                if (chunk.messageId) msgId = chunk.messageId;
                setStreaming({ isStreaming: true, partialContent: accumulated });
              } else if (chunk.type === "done") {
                if (chunk.confidence) confidence = chunk.confidence;
                if (chunk.sources) sources = chunk.sources;
              } else if (chunk.type === "error") {
                throw new Error(chunk.error ?? "AI response error");
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        const assistantMessage: ChatMessage = {
          id: msgId,
          role: "assistant",
          content: accumulated || "I'm sorry, I couldn't generate a response. Please try again.",
          timestamp: new Date(),
          language,
          confidence,
          ...(sources.length > 0 && { sources: sources as readonly string[] }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreaming({ isStreaming: false, partialContent: "" });

        // Voice output if enabled
        if (voiceEnabled && accumulated) {
          speak(accumulated.slice(0, 500), language); // TTS first 500 chars
        }

        announce(`AI responded: ${accumulated.slice(0, 100)}${accumulated.length > 100 ? "..." : ""}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errMsg);
        setStreaming({ isStreaming: false, partialContent: "" });
        announce(`Error: ${errMsg}`, true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streaming.isStreaming, messages, sessionId, selectedVenueId, language, userPrefs, voiceEnabled, speak]
  );

  // ─── Keyboard Handler ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage]
  );

  // ─── Voice Input ───────────────────────────────────────────────────────────

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening(
      (text) => setInputValue((prev) => prev + (prev ? " " : "") + text),
      (err) => setError(`Voice error: ${err}`)
    );
  }, [isListening, startListening, stopListening]);

  // ─── Suggested Prompts ─────────────────────────────────────────────────────

  const suggestions = [
    "How do I get to my seat in Section 115?",
    "Which exit is least crowded right now?",
    "Where are the accessible restrooms?",
    "What are my transport options after the match?",
    "I need medical assistance nearby",
    "What food options are available for vegans?",
  ];

  const selectedVenue = VENUES.find((v) => v.id === selectedVenueId);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--gradient-hero)",
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-6)",
          height: "var(--header-height)",
          borderBottom: "1px solid var(--surface-glass-border)",
          background: "var(--surface-header)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
          zIndex: "var(--z-sticky)",
        }}
      >
        <a href="#main-content" className="skip-nav">Skip to chat</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} aria-label="Back to home" className="btn btn-icon btn-sm">
            <Icon d={ICONS.arrowLeft} size={20} />
          </Link>
          <Logo size={28} />
          <span className="badge badge-live" aria-label="Live AI service">LIVE</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Venue Selector */}
          <label htmlFor="venue-select" className="sr-only">Select venue</label>
          <select
            id="venue-select"
            value={selectedVenueId}
            onChange={(e) => setSelectedVenueId(e.target.value)}
            aria-label="Select stadium venue"
            style={{
              background: "var(--surface-glass)",
              border: "1px solid var(--surface-glass-border)",
              color: "var(--text-primary)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              minHeight: "var(--touch-target-min)",
            }}
          >
            {VENUES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Language Selector */}
          <label htmlFor="language-select" className="sr-only">Select language</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            aria-label="Select chat language"
            style={{
              background: "var(--surface-glass)",
              border: "1px solid var(--surface-glass-border)",
              color: "var(--text-primary)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
              minHeight: "var(--touch-target-min)",
            }}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          {/* Voice toggle */}
          <button
            onClick={() => { setVoiceEnabled((v) => !v); if (voiceEnabled) stop(); }}
            className="btn btn-icon"
            aria-pressed={voiceEnabled}
            aria-label={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            title={voiceEnabled ? "Voice output ON" : "Voice output OFF"}
          >
            <Icon d={voiceEnabled ? ICONS.volume2 : ICONS.volumeX} size={22} />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Active Venue Banner ─────────────────────────────────────────── */}
      {selectedVenue && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "var(--space-2) var(--space-6)",
            background: "hsla(220, 90%, 56%, 0.08)",
            borderBottom: "1px solid hsla(220, 90%, 56%, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          <Icon d={ICONS.pin} size={20} style={{ color: "var(--color-brand-primary)" }} />
          <strong>{selectedVenue.name}</strong> · {selectedVenue.city}, {selectedVenue.state} ·
          Capacity: {selectedVenue.capacity.toLocaleString()}
          {selectedVenue.accessibilityFeatures.length > 0 && (
            <span className="badge badge-info" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon d={ICONS.wheelchair} size={16} /> Accessible
            </span>
          )}
        </div>
      )}

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Messages Area */}
        <div
          role="log"
          aria-label="Conversation history"
          aria-live="polite"
          aria-atomic="false"
          aria-relevant="additions"
          id={chatId}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming partial message */}
          {streaming.isStreaming && (
            <div
              aria-label="AI is typing"
              style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--gradient-brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                <Icon d={ICONS.stadium} size={20} />
              </div>
              <div className="chat-bubble-assistant">
                {streaming.partialContent ? (
                  <MarkdownContent content={streaming.partialContent} />
                ) : (
                  <div className="chat-typing-indicator" aria-label="AI is composing a response">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="alert-banner alert-banner-critical"
              style={{ maxWidth: "600px" }}
            >
              <Icon d={ICONS.alertTriangle} size={20} />
              <div>
                <strong>Error:</strong> {error}
                <button
                  onClick={() => setError(null)}
                  style={{ marginLeft: "var(--space-3)" }}
                  className="btn btn-sm btn-secondary"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* ── Suggested Prompts ─────────────────────────────────────────── */}
        {messages.length <= 1 && (
          <div
            aria-label="Suggested questions"
            style={{
              padding: "0 var(--space-6) var(--space-4)",
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
            }}
          >
            <p
              style={{
                width: "100%",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginBottom: "var(--space-1)",
                fontWeight: "var(--weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Try asking:
            </p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => void sendMessage(s)}
                className="btn btn-secondary btn-sm"
                aria-label={`Ask: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Area ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "var(--space-4) var(--space-6) var(--space-6)",
            borderTop: "1px solid var(--surface-glass-border)",
            background: "var(--surface-bg)",
            backdropFilter: "blur(12px)",
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); void sendMessage(inputValue); }}
            role="search"
            aria-label="Send a message to AI assistant"
          >
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                alignItems: "flex-end",
                maxWidth: "900px",
                margin: "0 auto",
              }}
            >
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className="btn btn-icon"
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                aria-pressed={isListening}
                style={{
                  borderColor: isListening ? "var(--color-brand-danger)" : undefined,
                  color: isListening ? "var(--color-brand-danger)" : undefined,
                  animation: isListening ? "pulse 1s infinite" : undefined,
                  flexShrink: 0,
                }}
              >
                {isListening ? <Icon d={ICONS.stop} size={22} /> : <Icon d={ICONS.mic} size={22} />}
              </button>

              {/* Text Input */}
              <div style={{ flex: 1, position: "relative" }}>
                <label htmlFor="chat-input" className="sr-only">
                  Type a message (press Enter to send, Shift+Enter for newline)
                </label>
                <textarea
                  id="chat-input"
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? "Listening... speak now"
                      : "Ask about navigation, food, transport, accessibility..."
                  }
                  aria-multiline="true"
                  aria-label="Chat message input"
                  aria-describedby="chat-input-hint"
                  rows={1}
                  disabled={streaming.isStreaming}
                  style={{
                    width: "100%",
                    minHeight: "var(--touch-target-min)",
                    maxHeight: "120px",
                    padding: "var(--space-3) var(--space-4)",
                    fontSize: "var(--text-base)",
                    fontFamily: "var(--font-sans)",
                    color: "var(--text-primary)",
                    background: "var(--surface-glass)",
                    border: "1px solid var(--surface-glass-border)",
                    borderRadius: "var(--radius-lg)",
                    resize: "none",
                    outline: "none",
                    transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                    lineHeight: "var(--leading-normal)",
                    overflow: "hidden",
                    overflowY: "auto",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-brand-primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px hsla(220, 90%, 56%, 0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
                <p id="chat-input-hint" className="sr-only">
                  Press Enter to send. Press Shift+Enter for a new line.
                </p>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || streaming.isStreaming}
                className="btn btn-primary"
                aria-label="Send message"
                style={{ flexShrink: 0, gap: "var(--space-2)" }}
              >
                {streaming.isStreaming ? (
                  <span aria-label="Sending...">⟳</span>
                ) : (
                  <>Send <Icon d={ICONS.send} size={18} /></>
                )}
              </button>
            </div>
          </form>
          <p
            style={{
              textAlign: "center",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginTop: "var(--space-2)",
            }}
          >
            AI responses may not be 100% accurate. For emergencies, contact stadium security directly.
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Message Bubble Component ─────────────────────────────────────────────────

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
      className="animate-fade-in-up"
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: isUser ? "var(--surface-card)" : "var(--gradient-brand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isUser ? "var(--text-secondary)" : "white",
          flexShrink: 0,
          border: "1px solid var(--surface-glass-border)",
        }}
      >
        {isUser ? <Icon d={ICONS.user} size={20} /> : <Icon d={ICONS.stadium} size={20} />}
      </div>

      <div style={{ maxWidth: "80%" }}>
        <div
          className={isUser ? "chat-bubble-user" : "chat-bubble-assistant"}
          aria-label={`${isUser ? "You" : "StadiumBuddy AI"}: ${message.content}`}
        >
          <MarkdownContent content={message.content} />
        </div>

        {/* Metadata */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginTop: "var(--space-1)",
            justifyContent: isUser ? "flex-end" : "flex-start",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <time dateTime={message.timestamp.toISOString()}>
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </time>
          </span>
          {message.confidence && !isUser && (
            <span
              className={`badge badge-${message.confidence === "high" ? "low" : message.confidence === "medium" ? "moderate" : "high"}`}
              aria-label={`Confidence: ${message.confidence}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              {message.confidence === "uncertain" && <Icon d={ICONS.alertTriangle} size={14} />}
              {message.confidence}
            </span>
          )}
          {message.sources && message.sources.length > 0 && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Sources: {message.sources.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
// Minimal markdown parsing for bold, bullets, and line breaks

const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div style={{ lineHeight: "var(--leading-relaxed)" }}>
      {lines.map((line, i) => {
        if (line.startsWith("• ") || line.startsWith("- ") || line.match(/^\d+\.\s/)) {
          return (
            <div key={i} style={{ paddingLeft: "var(--space-3)", marginBottom: "var(--space-1)" }}>
              <span aria-hidden="true">• </span>
              <InlineFormatted text={line.replace(/^[•\-]\s|\d+\.\s/, "")} />
            </div>
          );
        }
        if (line.startsWith("## ") || line.startsWith("### ")) {
          return (
            <p key={i} style={{ fontWeight: "var(--weight-bold)", marginBottom: "var(--space-2)" }}>
              <InlineFormatted text={line.replace(/^#{2,3}\s/, "")} />
            </p>
          );
        }
        if (line === "") return <div key={i} style={{ height: "var(--space-2)" }} />;
        return (
          <p key={i} style={{ marginBottom: "var(--space-1)" }}>
            <InlineFormatted text={line} />
          </p>
        );
      })}
    </div>
  );
});

const InlineFormatted = memo(function InlineFormatted({ text }: { text: string }) {
  // Process **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
});
