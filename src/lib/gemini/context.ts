// ─── RAG Context Builder ───────────────────────────────────────────────────────
// Retrieves relevant venue knowledge to inject into AI prompts.
// Implements a simple keyword-based retrieval (production would use embeddings).

import type { Venue, VenueFaq } from "@/types/venue.types";
import type { ZoneDensity } from "@/types/crowd.types";
import type { TransportOption } from "@/types/transport.types";
import type { Alert } from "@/types/alert.types";
import type { UserPreferences } from "@/types/chat.types";

export interface RagContext {
  readonly venueInfo: string;
  readonly relevantFaqs: string;
  readonly crowdStatus: string;
  readonly activeAlerts: string;
  readonly transportStatus: string;
  readonly userContext: string;
  readonly tokenEstimate: number;
}

// ─── Keyword Extractor ────────────────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, readonly string[]> = {
  accessibility: ["wheelchair", "accessible", "disability", "mobility", "hearing", "blind", "deaf", "assistance", "elderly", "parents", "slow", "stairs", "lift", "ramp", "wheelchair", "handicap", "stroller"],
  transport: ["bus", "metro", "shuttle", "train", "taxi", "uber", "lyft", "parking", "transport", "ride", "late", "delay", "hurry", "rush", "traffic", "transit"],
  food: ["food", "eat", "drink", "beer", "vegan", "halal", "kosher", "concession", "restaurant", "snack", "vegetarian", "allergy", "gluten", "diet"],
  safety: ["security", "safe", "emergency", "first aid", "medical", "police", "lost", "bag check", "hurt", "pain", "doctor"],
  navigation: ["where", "how do i get", "direction", "gate", "entrance", "exit", "section", "seat", "find", "stairs", "walk", "wayfinding", "gate a", "gate b", "gate c", "gate d"],
  tickets: ["ticket", "scan", "entry", "pass", "credential"],
};

/**
 * Extracts likely topic categories from a user message.
 * Used to select the most relevant FAQ chunks.
 */
function extractTopics(message: string): string[] {
  const lower = message.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([topic]) => topic);
}

// ─── FAQ Retriever ────────────────────────────────────────────────────────────

/**
 * Retrieves the top N most relevant FAQs for a given message.
 * Uses simple keyword matching (sufficient for hackathon; production uses embeddings).
 */
function retrieveRelevantFaqs(faqs: readonly VenueFaq[], message: string, limit = 3): VenueFaq[] {
  const topics = extractTopics(message);
  const lower = message.toLowerCase();

  const scored = faqs.map((faq) => {
    let score = 0;
    // Topic match
    if (topics.includes(faq.category)) score += 3;
    // Keyword overlap in question
    const questionWords = faq.question.toLowerCase().split(/\s+/);
    const messageWords = lower.split(/\s+/);
    const overlap = questionWords.filter((w) => messageWords.includes(w)).length;
    score += overlap;
    return { faq, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.faq);
}

// ─── Context Builder ─────────────────────────────────────────────────────────

/**
 * Builds the RAG context string to inject into the AI prompt.
 * Optimized for token efficiency (< 2000 tokens total).
 */
export function buildRagContext(params: {
  venue: Venue;
  message: string;
  crowdZones: readonly ZoneDensity[];
  activeAlerts: readonly Alert[];
  transportOptions: readonly TransportOption[];
  userPreferences: UserPreferences;
}): RagContext {
  const { venue, message, crowdZones, activeAlerts, transportOptions, userPreferences } = params;

  // ── Venue Info (always included, concise) ──
  const venueInfo = `VENUE: ${venue.name}, ${venue.city}, ${venue.state}
Capacity: ${venue.capacity.toLocaleString()} | Zones: ${venue.zones.length}
Accessibility: ${venue.accessibilityFeatures.slice(0, 3).join("; ")}
Transport: ${venue.transportOptions.join(", ")}`;

  // ── Relevant FAQs ──
  const relevantFaqs = retrieveRelevantFaqs(venue.faqs, message)
    .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    .join("\n\n");

  // ── Crowd Status ──
  const crowdStatus =
    crowdZones.length > 0
      ? crowdZones
          .map((z) => `${z.zoneName}: ${z.level.toUpperCase()} (${z.density}% capacity)`)
          .join("\n")
      : "Crowd data unavailable";

  // ── Active Alerts ──
  const activeAlerts2 = activeAlerts
    .filter((a) => a.isActive)
    .map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.message}`)
    .join("\n");

  // ── Transport Status ──
  const transportStatus =
    transportOptions.length > 0
      ? transportOptions
          .slice(0, 3)
          .map(
            (t) =>
              `${t.mode.toUpperCase()}: ${t.routeName} – Wait: ${t.estimatedWaitMinutes}min, Load: ${t.currentLoad}%`
          )
          .join("\n")
      : "Transport data unavailable";

  // ── User Context ──
  const userContext = [
    userPreferences.mobilityAssistanceNeeded ? "User needs mobility assistance" : null,
    userPreferences.seatingZone ? `Seated in: ${userPreferences.seatingZone}` : null,
    userPreferences.preferredTransport
      ? `Preferred transport: ${userPreferences.preferredTransport}`
      : null,
    userPreferences.dietaryRestrictions.length > 0
      ? `Dietary: ${userPreferences.dietaryRestrictions.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const fullContext = [venueInfo, relevantFaqs, crowdStatus, activeAlerts2, transportStatus, userContext].join("\n");
  // Rough token estimate (1 token ≈ 4 chars)
  const tokenEstimate = Math.ceil(fullContext.length / 4);

  return {
    venueInfo,
    relevantFaqs: relevantFaqs || "No FAQs available for this query",
    crowdStatus,
    activeAlerts: activeAlerts2 || "No active alerts",
    transportStatus,
    userContext: userContext || "No user preferences set",
    tokenEstimate,
  };
}

/**
 * Formats the RAG context for injection into the AI prompt.
 */
export function formatContextForPrompt(context: RagContext): string {
  return `## Current Stadium Context

### Venue Information
${context.venueInfo}

### Relevant FAQs
${context.relevantFaqs}

### Live Crowd Status
${context.crowdStatus}

### Active Alerts
${context.activeAlerts}

### Transport Options
${context.transportStatus}

### User Profile
${context.userContext}`;
}
