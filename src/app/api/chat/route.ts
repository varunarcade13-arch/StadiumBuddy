import { type NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { runInputGuardrails, validateOutput } from "@/lib/gemini/guardrails";
import { buildRagContext, formatContextForPrompt } from "@/lib/gemini/context";
import { chatRequestSchema, type ValidatedChatRequest } from "@/lib/validators/chat.validator";
import { aiRateLimitMiddleware } from "@/lib/middleware/rate-limiter";
import { MockCrowdRepository, MockAlertRepository, MockTransportRepository } from "@/lib/repositories/mock.repositories";
import { CrowdService, TransportService } from "@/lib/services/services";
import { getVenueById } from "@/lib/constants/venues";

// Service instances (singleton pattern at module level)
const crowdService = new CrowdService(new MockCrowdRepository());
const transportService = new TransportService(new MockTransportRepository());
const alertRepo = new MockAlertRepository();

/**
 * Parses and validates the request body using chatRequestSchema.
 * @param request - Incoming request object
 * @returns Parsed payload or validation error details
 */
async function parseAndValidateBody(request: NextRequest): Promise<
  | { data: ValidatedChatRequest }
  | { error: string; details?: any; status: number }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }

  const parseResult = chatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return { error: "Validation failed", details: parseResult.error.flatten(), status: 400 };
  }

  return { data: parseResult.data };
}

/**
 * Runs input guardrails on a user message.
 * @param message - User query message
 * @returns Response error or sanitized input string
 */
function checkGuardrails(message: string): Response | string {
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
  return guardrailResult.sanitizedInput ?? message;
}

/**
 * Collects active stadium context and builds the RAG context.
 * @param venueId - Active stadium ID
 * @param message - Guardrail-approved message
 * @param userPreferences - User settings (accessibility, seating, transit)
 * @returns RagContext object or null if venueId is invalid
 */
async function getChatContext(
  venueId: string,
  message: string,
  userPreferences: any
) {
  const venue = getVenueById(venueId);
  if (!venue) return null;

  const [crowdSnapshot, activeAlerts, transportOptions] = await Promise.all([
    crowdService.getVenueCrowdStatus(venueId),
    alertRepo.getActiveAlerts(venueId),
    transportService.getOptions(venueId),
  ]);

  return buildRagContext({
    venue,
    message,
    crowdZones: crowdSnapshot.zones,
    activeAlerts: [...activeAlerts],
    transportOptions: [...transportOptions],
    userPreferences,
  });
}

/**
 * Constructs the language safety instruction prompt if needed.
 * @param language - Target language code (e.g., 'es', 'fr')
 * @returns Formatted language instruction string
 */
function buildLanguageInstruction(language: string): string {
  const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", es: "Spanish (Español)", fr: "French (Français)",
    ar: "Arabic (العربية)", pt: "Portuguese (Português)", de: "German (Deutsch)",
    zh: "Chinese (中文)", hi: "Hindi (हिन्दी)", ja: "Japanese (日本語)", ko: "Korean (한국어)",
  };
  const languageName = LANGUAGE_NAMES[language] ?? language;
  return language !== "en"
    ? `[LANGUAGE INSTRUCTION] You MUST respond ENTIRELY in ${languageName}. Every word of your response must be in ${languageName}. Do NOT use English unless it is a proper noun (e.g. stadium name, brand).\n\n`
    : "";
}

/**
 * Continuously streams AI delta blocks to the client.
 * @param stream - AsyncIterable stream from Gemini client
 * @param sendChunk - Controller streaming callback
 * @param messageId - Response message ID
 * @returns Fully accumulated response text
 */
async function streamDeltas(
  stream: any,
  sendChunk: (data: object) => void,
  messageId: string
): Promise<string> {
  let accumulatedText = "";
  for await (const chunk of stream) {
    const text = chunk.text();
    if (text) {
      accumulatedText += text;
      sendChunk({ type: "delta", content: text, messageId });
    }
  }
  return accumulatedText;
}

/**
 * Conducts output validation on generated text and fires completion event.
 * @param accumulatedText - Completed response string
 * @param sendChunk - Controller streaming callback
 * @param messageId - Response message ID
 * @param hasFaqs - Indicator of source metadata availability
 */
function finishStream(
  accumulatedText: string,
  sendChunk: (data: object) => void,
  messageId: string,
  hasFaqs: boolean
): void {
  const validation = validateOutput(accumulatedText);
  if (!validation.valid) {
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
      sources: hasFaqs ? ["Stadium FAQs", "Live Crowd Data"] : [],
    });
  }
}

/**
 * Handles errors occurring inside the streaming readable stream block.
 * @param error - Exception caught during stream processing
 * @param sendChunk - Controller streaming callback
 */
function handleStreamError(
  error: unknown,
  sendChunk: (data: object) => void
): void {
  const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
  sendChunk({
    type: "error",
    error: "I'm having trouble connecting to my knowledge base. Please try again in a moment.",
    debugInfo: process.env["NODE_ENV"] === "development" ? errorMessage : undefined,
  });
}

/**
 * Configures the streaming Server-Sent Events stream using ReadableStream.
 * @param model - GenerativeModel client
 * @param geminiHistory - Chat history blocks
 * @param fullMessage - Final formatted message with prompt context
 * @param messageId - Response message ID
 * @param hasFaqs - Indicator of source metadata availability
 * @returns Configured ReadableStream object
 */
function createGeminiStream(
  model: any,
  geminiHistory: any[],
  fullMessage: string,
  messageId: string,
  hasFaqs: boolean
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const sendChunk = (data: object): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessageStream(fullMessage);
        const accumulatedText = await streamDeltas(result.stream, sendChunk, messageId);
        finishStream(accumulatedText, sendChunk, messageId, hasFaqs);
      } catch (error) {
        handleStreamError(error, sendChunk);
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * POST /api/chat
 * Streams live crowd-aware RAG responses using Gemini 2.0 Flash model.
 * @param request - NextRequest object
 * @returns Response object containing SSE stream
 */
export async function POST(request: NextRequest): Promise<Response> {
  const rateLimitError = aiRateLimitMiddleware(request);
  if (rateLimitError) return rateLimitError;

  const parsed = await parseAndValidateBody(request);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: parsed.status }
    );
  }

  const guardrailCheck = checkGuardrails(parsed.data.message);
  if (guardrailCheck instanceof Response) return guardrailCheck;

  const ragContext = await getChatContext(parsed.data.venueId, guardrailCheck, parsed.data.userPreferences);
  if (!ragContext) return NextResponse.json({ error: "Unknown venue ID" }, { status: 400 });

  const contextString = formatContextForPrompt(ragContext);
  const geminiHistory = parsed.data.history.map((entry) => ({
    role: entry.role as "user" | "model",
    parts: [{ text: entry.parts[0] ?? "" }],
  }));

  const languageInstruction = buildLanguageInstruction(parsed.data.language);
  const fullMessage = `${languageInstruction}${contextString}\n\n## Fan Question\n${guardrailCheck}`;
  const messageId = `msg-${parsed.data.sessionId}-${Date.now()}`;

  const stream = createGeminiStream(getGeminiModel(), geminiHistory, fullMessage, messageId, !!ragContext.relevantFaqs);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * OPTIONS /api/chat
 * CORS preflight fallback handler.
 * @returns Response object
 */
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
