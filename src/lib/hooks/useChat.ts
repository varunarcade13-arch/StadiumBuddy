import { useState, useCallback, useRef, useEffect } from "react";
import type { ChatMessage, SupportedLanguage, UserPreferences } from "@/types/chat.types";
import { ROUTES } from "@/lib/constants/routes";

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

function announce(message: string, urgent = false): void {
  if (typeof document === "undefined") return;
  const id = urgent ? "emergency-announcer" : "global-announcer";
  const el = document.getElementById(id);
  if (el) {
    el.textContent = "";
    setTimeout(() => { el.textContent = message; }, 10);
  }
}

export function useChat(initialVenueId = "metlife") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [partialContent, setPartialContent] = useState("");
  const [sessionId] = useState(() => generateUUID());
  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    mobilityAssistanceNeeded: false,
    preferredTransport: null,
    dietaryRestrictions: [],
    language: "en",
    seatingZone: null,
  });

  const voiceSpeakRef = useRef<((text: string, lang: string) => void) | null>(null);

  // Set the voice speaker function dynamically from the component layer
  const setVoiceSpeaker = useCallback((speaker: (text: string, lang: string) => void) => {
    voiceSpeakRef.current = speaker;
  }, []);

  // Update preferences language
  useEffect(() => {
    setUserPrefs((prev) => ({ ...prev, language }));
  }, [language]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setInputValue("");
    setIsStreaming(false);
    setPartialContent("");
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

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
      setIsStreaming(true);
      setPartialContent("");
      announce("Sending message to AI assistant");

      // Build compact history (last 20 messages)
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
          const err = (await response.json()) as { error?: string; reason?: string };
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

            let chunk: {
              type: string;
              content?: string;
              messageId?: string;
              confidence?: ChatMessage["confidence"];
              sources?: string[];
              error?: string;
            } | null = null;

            try {
              chunk = JSON.parse(jsonStr);
            } catch {
              // Skip malformed chunks
              continue;
            }

            if (!chunk) continue;

            if (chunk.type === "delta" && chunk.content) {
              accumulated += chunk.content;
              if (chunk.messageId) msgId = chunk.messageId;
              setPartialContent(accumulated);
            } else if (chunk.type === "done") {
              if (chunk.confidence) confidence = chunk.confidence;
              if (chunk.sources) sources = chunk.sources;
            } else if (chunk.type === "error") {
              throw new Error(chunk.error ?? "AI response error");
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
        setIsStreaming(false);
        setPartialContent("");

        if (voiceEnabled && accumulated && voiceSpeakRef.current) {
          voiceSpeakRef.current(accumulated.slice(0, 500), language);
        }

        announce(`AI responded: ${accumulated.slice(0, 100)}${accumulated.length > 100 ? "..." : ""}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errMsg);
        setIsStreaming(false);
        setPartialContent("");
        announce(`Error: ${errMsg}`, true);
      }
    },
    [isStreaming, messages, sessionId, selectedVenueId, language, userPrefs, voiceEnabled]
  );

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isStreaming,
    partialContent,
    sessionId,
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
    clearConversation,
    setVoiceSpeaker,
  };
}
