// ─── Chat Route Error Path Tests ───────────────────────────────────────────────
// Tests the streaming error paths in POST /api/chat:
// - Stream error path (line 150-158): AI service throws
// The output validation failure path (line 134-140) requires guardrails to fail
// which is tested separately via guardrails.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { clearRateLimitStore } from "@/lib/middleware/rate-limiter";

// Mock the gemini client to throw on sendMessageStream
vi.mock("@/lib/gemini/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini/client")>();
  return {
    ...actual,
    getGeminiModel: vi.fn().mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessageStream: vi.fn().mockRejectedValue(new Error("AI service unavailable")),
      }),
    }),
  };
});

const { POST: chatPOST } = await import("@/app/api/chat/route");

const validPayload = {
  message: "Show me seating directions",
  sessionId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  venueId: "metlife",
  language: "en",
  history: [],
  userPreferences: {
    mobilityAssistanceNeeded: false,
    preferredTransport: null,
    dietaryRestrictions: [],
    language: "en",
    seatingZone: null,
  },
};

describe("POST /api/chat – stream error path (catch block)", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("sends error SSE event when AI service throws during streaming", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });

    const res = await chatPOST(req);
    // Stream always returns 200; errors are communicated via SSE
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    // Read the stream
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let done = false;

    while (!done) {
      const result = await reader?.read();
      done = result?.done ?? true;
      if (result?.value) {
        fullText += decoder.decode(result.value);
      }
    }

    // Should contain an error event with safe message (not raw error)
    expect(fullText).toContain("data:");
    expect(fullText).toContain("error");
    expect(fullText).toContain("knowledge base");
    // Should NOT expose internal error message
    expect(fullText).not.toContain("AI service unavailable");
  });
});
