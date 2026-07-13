"use client";

// ─── AI Chat Page ──────────────────────────────────────────────────────────────
// Client Component: manages streaming chat state, voice I/O, multilingual support

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import { Icon } from "@/app/components/Icon";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
import { VENUES } from "@/lib/constants/venues";
import { ROUTES } from "@/lib/constants/routes";

import { useChat } from "@/lib/hooks/useChat";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/lib/hooks/useSpeechSynthesis";

import { MessageList } from "@/app/chat/components/MessageList";
import { ChatInput } from "@/app/chat/components/ChatInput";
import { PreferencesModal } from "@/app/chat/components/PreferencesModal";
import type { ChatMessage, SupportedLanguage } from "@/types/chat.types";

export default function ChatPage() {
  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isStreaming,
    partialContent,
    selectedVenueId,
    setSelectedVenueId,
    language,
    setLanguage,
    voiceEnabled,
    setVoiceEnabled,
    userPrefs,
    setUserPrefs,
    error,
    setError,
    sendMessage,
    setVoiceSpeaker,
  } = useChat("metlife");

  const [mounted, setMounted] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);


  const { speak, stop } = useSpeechSynthesis();
  const { isListening, startListening, stopListening } = useSpeechRecognition(language);

  // Provide speaker function to useChat
  useEffect(() => {
    setVoiceSpeaker(speak);
  }, [speak, setVoiceSpeaker]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partialContent]);

  // Set mounted on client load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update welcome message when language changes or on mount
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

    setMessages((prev) => {
      const nonWelcome = prev.filter((m) => m.id !== "welcome");
      return [welcome, ...nonWelcome];
    });
  }, [language, mounted, setMessages]);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening(
      (text) => setInputValue(inputValue ? `${inputValue} ${text}` : text),
      (err) => setError(`Voice error: ${err}`)
    );
  }, [isListening, startListening, stopListening, inputValue, setInputValue, setError]);

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
            <Icon name="arrowLeft" size={20} />
          </Link>
          <Logo size={28} />
          <span className="badge badge-live" aria-label="Live AI service">LIVE</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Preferences Trigger */}
          <button
            onClick={() => setPrefsOpen(true)}
            className="btn btn-secondary btn-sm"
            aria-label="Assistant preferences"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: "var(--touch-target-min)" }}
          >
            <Icon name="wheelchair" size={16} /> Preferences
          </button>

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
            onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) stop(); }}
            className="btn btn-icon"
            aria-pressed={voiceEnabled}
            aria-label={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            title={voiceEnabled ? "Voice output ON" : "Voice output OFF"}
          >
            <Icon name={voiceEnabled ? "volume2" : "volumeX"} size={22} />
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
          <Icon name="pin" size={20} style={{ color: "var(--color-brand-primary)" }} />
          <strong>{selectedVenue.name}</strong> · {selectedVenue.city}, {selectedVenue.state} ·
          Capacity: {selectedVenue.capacity.toLocaleString()}
          {(selectedVenue.accessibilityFeatures.length > 0 || userPrefs.mobilityAssistanceNeeded) && (
            <span className="badge badge-info" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="wheelchair" size={16} /> Accessible
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
        {/* Messages List Component */}
        <MessageList messages={messages} isStreaming={isStreaming} partialContent={partialContent} />

        {/* Error state banner */}
        {error && (
          <div
            role="alert"
            className="alert-banner alert-banner-critical"
            style={{ maxWidth: "600px", margin: "0 auto var(--space-4)", display: "flex", gap: "var(--space-2)" }}
          >
            <Icon name="alertTriangle" size={20} />
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

        {/* ── Input Area Component ────────────────────────────────────────── */}
        <ChatInput
          ref={inputRef}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isStreaming={isStreaming}
          isListening={isListening}
          onVoiceToggle={handleVoiceInput}
          onSubmit={sendMessage}
        />
      </main>

      {/* Preferences Modal Dialog */}
      <PreferencesModal
        isOpen={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        userPrefs={userPrefs}
        onChange={setUserPrefs}
      />
    </div>
  );
}
