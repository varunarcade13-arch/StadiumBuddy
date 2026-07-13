// ─── AI Guardrails ─────────────────────────────────────────────────────────────
// Implements prompt injection protection, jailbreak detection, and output validation.
// This is a PURE module with no side effects – fully testable.

/** Result of an injection detection check */
export interface GuardrailResult {
  readonly safe: boolean;
  readonly reason: string | null;
  readonly sanitizedInput: string | null;
}

/** Result of output validation */
export interface OutputValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
  readonly sanitizedOutput: string;
}

// ─── Prompt Injection Detection ──────────────────────────────────────────────

/**
 * Known prompt injection patterns.
 * Ordered from most to least specific for early exit optimization.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // Classic override attempts
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /forget\s+(everything|all|your|previous|the)\s*(you\s+know|instructions?|training|above)?/i,
  /disregard\s+(all|previous|your|the)\s*(instructions?|prompts?|context|above)/i,
  // Role-play jailbreaks
  /you\s+are\s+now\s+(DAN|an?\s+AI\s+without|a\s+different|an?\s+unfiltered)/i,
  /act\s+(as|like)\s+(?:if\s+)?you\s+(have\s+no\s+(restrictions?|limits?|rules?)|are\s+(a\s+)?(?:DAN|evil|unrestricted))/i,
  /pretend\s+(that\s+)?(you\s+)?(have\s+no\s+|are\s+not\s+an?\s+|are\s+)?(?:AI|restrictions?|rules?)/i,
  // System prompt extraction
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /show\s+me\s+(your\s+)?(system\s+|hidden\s+)?instructions?/i,
  /print\s+(your\s+)?(initial\s+|original\s+|full\s+)?system\s+prompt/i,
  // Token smuggling attempts
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<\|system\|>/i,
  /###\s*instruction/i,
  // Developer mode exploits
  /developer\s+mode\s+(enabled|on|activated)/i,
  /jailbreak\s+(mode|enabled|activated)/i,
  // Data exfiltration attempts
  /repeat\s+(everything|all|the\s+above|the\s+text|verbatim)/i,
  /output\s+(the\s+)?(entire|full|complete|raw)\s+(system\s+)?prompt/i,
  // CRLF injection
  /(\r\n|\r|\n).*(system:|assistant:|human:|user:)/i,
];

/**
 * Detects prompt injection or jailbreak attempts in user input.
 * @param input - Raw user message
 * @returns GuardrailResult with safe flag and optional reason
 */
export function detectInjection(input: string): GuardrailResult {
  if (!input || input.trim().length === 0) {
    return { safe: false, reason: "Empty input", sanitizedInput: null };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: "Prompt injection attempt detected",
        sanitizedInput: null,
      };
    }
  }

  return {
    safe: true,
    reason: null,
    sanitizedInput: sanitizeInput(input),
  };
}

// ─── Input Sanitization ───────────────────────────────────────────────────────

/**
 * Sanitizes user input to prevent XSS and prompt manipulation.
 * Strips control characters, limits length, normalizes whitespace.
 */
export function sanitizeInput(input: string): string {
  return (
    input
      // Remove null bytes and control characters (except newline and tab)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize whitespace runs
      .replace(/[ \t]+/g, " ")
      // Limit consecutive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Trim
      .trim()
      // Hard cap at 1000 chars (belt-and-suspenders after Zod validation)
      .slice(0, 1000)
  );
}

// ─── Output Validation ────────────────────────────────────────────────────────

/** Maximum allowed output length in characters */
const MAX_OUTPUT_LENGTH = 8000;

/** Patterns that should not appear in AI output */
const HARMFUL_OUTPUT_PATTERNS: readonly RegExp[] = [
  // System prompt leakage
  /you\s+are\s+stadium\s*buddy.*your\s+role/i,
  // Personal data patterns
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN
  /\b4[0-9]{12}(?:[0-9]{3})?\b/, // Visa card number
  // Dangerous instructions
  /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive)/i,
];

/**
 * Validates AI model output before sending to client.
 * @param output - Raw AI response text
 * @returns OutputValidationResult
 */
export function validateOutput(output: string): OutputValidationResult {
  if (!output || output.trim().length === 0) {
    return {
      valid: false,
      reason: "Empty output from AI model",
      sanitizedOutput: "I'm sorry, I couldn't generate a response. Please try again.",
    };
  }

  // Check for harmful content patterns
  for (const pattern of HARMFUL_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      return {
        valid: false,
        reason: "Output contained potentially harmful content",
        sanitizedOutput:
          "I'm sorry, I can't provide that information. Please ask me about stadium navigation, match information, or general World Cup assistance.",
      };
    }
  }

  // Truncate if too long
  const sanitized = output.length > MAX_OUTPUT_LENGTH ? output.slice(0, MAX_OUTPUT_LENGTH) + "…" : output;

  return { valid: true, reason: null, sanitizedOutput: sanitized };
}

// ─── Content Category Classifier ─────────────────────────────────────────────

/** Categories of questions the chatbot should handle */
export type AllowedCategory =
  | "navigation"
  | "match-info"
  | "transport"
  | "food-beverage"
  | "accessibility"
  | "safety-general"
  | "sustainability"
  | "weather"
  | "general-stadium"
  | "emergency-guidance";

/** Categories that are explicitly off-topic */
const OFF_TOPIC_PATTERNS: readonly RegExp[] = [
  /\b(stock|crypto|bitcoin|invest|trade|forex)\b/i,
  /\b(politics|election|president|parliament|congress)\b/i,
  /\b(adult|xxx|porn|sex)\b/i,
  /\b(drug|narcotics|heroin|cocaine|meth)\b/i,
  /\b(hack|exploit|vulnerability|0day|zero.day)\b/i,
];

/**
 * Checks if a message appears to be on-topic for stadium assistance.
 */
export function isOnTopic(input: string): boolean {
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }
  return true;
}

/**
 * Runs the complete guardrail pipeline on user input.
 * Returns safe=false if any check fails.
 */
export function runInputGuardrails(input: string): GuardrailResult {
  // 1. Injection detection
  const injectionResult = detectInjection(input);
  if (!injectionResult.safe) return injectionResult;

  // 2. Topic filter
  if (!isOnTopic(input)) {
    return {
      safe: false,
      reason: "Off-topic request – I can only help with FIFA World Cup 2026 stadium assistance.",
      sanitizedInput: null,
    };
  }

  return {
    safe: true,
    reason: null,
    sanitizedInput: injectionResult.sanitizedInput,
  };
}
