// ─── Chat Types ────────────────────────────────────────────────────────────────
// Domain types for the AI chatbot module.
// Follows immutable value-object pattern.

/** Supported languages for multilingual chat */
export type SupportedLanguage =
  | "en"
  | "es"
  | "fr"
  | "ar"
  | "pt"
  | "de"
  | "zh"
  | "hi"
  | "ja"
  | "ko";

/** Message role in a conversation */
export type MessageRole = "user" | "assistant" | "system";

/** Confidence level of an AI response */
export type ConfidenceLevel = "high" | "medium" | "low" | "uncertain";

/** A single chat message */
export interface ChatMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp: Date;
  readonly language: SupportedLanguage;
  readonly confidence?: ConfidenceLevel;
  readonly sources?: readonly string[];
  readonly isStreaming?: boolean;
}

/** User-facing chat context (session memory) */
export interface ChatSession {
  readonly sessionId: string;
  readonly userId: string | null;
  readonly venueId: string;
  readonly language: SupportedLanguage;
  readonly messages: readonly ChatMessage[];
  readonly userPreferences: UserPreferences;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** User preferences stored for personalization */
export interface UserPreferences {
  readonly mobilityAssistanceNeeded: boolean;
  readonly preferredTransport: "walking" | "shuttle" | "metro" | "taxi" | null;
  readonly dietaryRestrictions: readonly string[];
  readonly language: SupportedLanguage;
  readonly seatingZone: string | null;
}

/** Request payload for the chat API */
export interface ChatRequest {
  readonly message: string;
  readonly sessionId: string;
  readonly venueId: string;
  readonly language: SupportedLanguage;
  readonly history: readonly ChatHistoryEntry[];
  readonly userPreferences: UserPreferences;
}

/** Compact history entry for API (reduces tokens) */
export interface ChatHistoryEntry {
  readonly role: "user" | "model";
  readonly parts: readonly string[];
}

/** Streaming chunk from chat API */
export interface ChatStreamChunk {
  readonly type: "delta" | "done" | "error";
  readonly content?: string;
  readonly messageId?: string;
  readonly confidence?: ConfidenceLevel;
  readonly sources?: readonly string[];
  readonly error?: string;
}
