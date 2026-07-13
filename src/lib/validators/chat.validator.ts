// ─── Chat Request Validator ──────────────────────────────────────────────────
// Uses Zod for runtime validation – never trust user input

import { z } from "zod";

const SUPPORTED_LANGUAGES = [
  "en", "es", "fr", "ar", "pt", "de", "zh", "hi", "ja", "ko",
] as const;

/** Schema for a single chat history entry (compact format for token efficiency) */
export const chatHistoryEntrySchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(z.string().max(4000)).max(1),
});

/** Schema for user preferences */
export const userPreferencesSchema = z.object({
  mobilityAssistanceNeeded: z.boolean().default(false),
  preferredTransport: z
    .enum(["walking", "shuttle", "metro", "taxi"])
    .nullable()
    .default(null),
  dietaryRestrictions: z.array(z.string().max(50)).max(10).default([]),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
  seatingZone: z.string().max(20).nullable().default(null),
});

/** Full chat request schema with strict validation */
export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long (max 1000 characters)")
    .transform((s) => s.trim()),
  sessionId: z.string().uuid("Invalid session ID"),
  venueId: z.string().min(1).max(50),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
  history: z.array(chatHistoryEntrySchema).max(40), // 20 pairs = 40 entries
  userPreferences: userPreferencesSchema.default({
    mobilityAssistanceNeeded: false,
    preferredTransport: null,
    dietaryRestrictions: [],
    language: "en",
    seatingZone: null,
  }),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;

/** Schema for navigation request */
export const navigationRequestSchema = z.object({
  venueId: z.string().min(1).max(50),
  fromWaypointId: z.string().min(1).max(50),
  toWaypointId: z.string().min(1).max(50),
  accessible: z.boolean().default(false),
  avoidCrowdedZones: z.boolean().default(true),
});

export type ValidatedNavigationRequest = z.infer<typeof navigationRequestSchema>;

/** Schema for alert creation (ops staff only) */
export const createAlertSchema = z.object({
  venueId: z.string().min(1).max(50),
  zoneId: z.string().max(50).nullable().default(null),
  category: z.enum(["crowd", "medical", "security", "fire", "weather", "transport", "general"]),
  severity: z.enum(["info", "warning", "critical", "emergency"]),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  affectedZones: z.array(z.string().max(50)).max(20).default([]),
  createdBy: z.string().min(1).max(100),
});

export type ValidatedCreateAlert = z.infer<typeof createAlertSchema>;
