// ─── AI Chat API Route ─────────────────────────────────────────────────────────
// POST /api/chat
// Streaming Server-Sent Events response using Gemini 2.0 Flash.
// Implements: rate limiting, input validation, guardrails, RAG context, streaming.

import { type NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { runInputGuardrails, validateOutput } from "@/lib/gemini/guardrails";
import { buildRagContext, formatContextForPrompt } from "@/lib/gemini/context";
import { chatRequestSchema } from "@/lib/validators/chat.validator";
import { aiRateLimitMiddleware } from "@/lib/middleware/rate-limiter";
import { MockCrowdRepository, MockAlertRepository, MockTransportRepository } from "@/lib/repositories/mock.repositories";
import { CrowdService, TransportService } from "@/lib/services/services";
import { getVenueById } from "@/lib/constants/venues";

// Service instances (singleton pattern at module level)
const crowdService = new CrowdService(new MockCrowdRepository());
const transportService = new TransportService(new MockTransportRepository());
const alertRepo = new MockAlertRepository();

export async function POST(request: NextRequest): Promise<Response> {
  // ── 1. Rate Limiting ──────────────────────────────────────────────────────
  const rateLimitError = aiRateLimitMiddleware(request);
  if (rateLimitError) return rateLimitError;

  // ── 2. Parse and Validate Request ─────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = chatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { message, sessionId, venueId, language, history, userPreferences } = parseResult.data;

  // ── 3. Input Guardrails ────────────────────────────────────────────────────
  const guardrailResult = runInputGuardrails(message);
  if (!guardrailResult.safe) {
    return NextResponse.json(
      {
        error: "Message rejected by safety filter",
        reason: guardrailResult.reason,
        type: "guardrail_rejection",
      },
      { status: 422 }
    );
  }

  // ── 4. Venue Validation ────────────────────────────────────────────────────
  const venue = getVenueById(venueId);
  if (!venue) {
    return NextResponse.json({ error: "Unknown venue ID" }, { status: 400 });
  }

  // ── 5. Build RAG Context ───────────────────────────────────────────────────
  const [crowdSnapshot, activeAlerts, transportOptions] = await Promise.all([
    crowdService.getVenueCrowdStatus(venueId),
    alertRepo.getActiveAlerts(venueId),
    transportService.getOptions(venueId),
  ]);

  const ragContext = buildRagContext({
    venue,
    message: guardrailResult.sanitizedInput ?? message,
    crowdZones: crowdSnapshot.zones,
    activeAlerts: [...activeAlerts],
    transportOptions: [...transportOptions],
    userPreferences,
  });

  const contextString = formatContextForPrompt(ragContext);

  // ── 6. Build Chat History for Gemini ──────────────────────────────────────
  const geminiHistory = history.map((entry) => ({
    role: entry.role as "user" | "model",
    parts: [{ text: entry.parts[0] ?? "" }],
  }));

  // ── 7. Start Streaming Chat Session ───────────────────────────────────────
  const model = getGeminiModel();

  // Language instruction prepended to message
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", es: "Spanish (Español)", fr: "French (Français)",
    ar: "Arabic (العربية)", pt: "Portuguese (Português)", de: "German (Deutsch)",
    zh: "Chinese (中文)", hi: "Hindi (हिन्दी)", ja: "Japanese (日本語)", ko: "Korean (한국어)",
  };
  const languageName = LANGUAGE_NAMES[language] ?? language;
  const languageInstruction =
    language !== "en"
      ? `[LANGUAGE INSTRUCTION] You MUST respond ENTIRELY in ${languageName}. Every word of your response must be in ${languageName}. Do NOT use English unless it is a proper noun (e.g. stadium name, brand).\n\n`
      : "";

  const fullMessage = `${languageInstruction}${contextString}\n\n## Fan Question\n${guardrailResult.sanitizedInput ?? message}`;

  // ── 8. Create SSE Stream ───────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const messageId = `msg-${sessionId}-${Date.now()}`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendChunk = (data: object): void => {
        const json = JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${json}\n\n`));
      };

      try {
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessageStream(fullMessage);

        let accumulatedText = "";

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            accumulatedText += text;
            sendChunk({ type: "delta", content: text, messageId });
          }
        }

        // Validate complete output before signaling done
        const validation = validateOutput(accumulatedText);

        if (!validation.valid) {
          // Send a sanitized replacement
          sendChunk({
            type: "done",
            messageId,
            content: validation.sanitizedOutput,
            confidence: "low",
            sources: [],
          });
        } else {
          sendChunk({
            type: "done",
            messageId,
            confidence: "high",
            sources: ragContext.relevantFaqs ? ["Stadium FAQs", "Live Crowd Data"] : [],
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown AI error";
        // Secure error handling – never expose internal details
        sendChunk({
          type: "error",
          error:
            "I'm having trouble connecting to my knowledge base. Please try again in a moment.",
          debugInfo: process.env["NODE_ENV"] === "development" ? errorMessage : undefined,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// OPTIONS for CORS preflight
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
