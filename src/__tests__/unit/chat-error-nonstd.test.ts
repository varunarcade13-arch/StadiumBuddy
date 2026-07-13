// ─── Chat Route Non-Standard Error Tests ──────────────────────────────────────
// Covers:
// - L151: non-Error thrown (string) → "Unknown AI error" fallback
// - L157: NODE_ENV === "development" → debugInfo included in error event

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { clearRateLimitStore } from "@/lib/middleware/rate-limiter";

const originalEnv = process.env;

// Mock gemini to throw a plain string (non-Error)
vi.mock("@/lib/gemini/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini/client")>();
  return {
    ...actual,
    getGeminiModel: vi.fn().mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        // Throw a plain string, not an Error instance
        sendMessageStream: vi.fn().mockRejectedValue("plain string error"),
      }),
    }),
  };
});

const { POST: chatPOST } = await import("@/app/api/chat/route");

const validPayload = {
  message: "Show me seating",
  sessionId: "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a77",
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

describe("POST /api/chat – non-Error catch and development debugInfo (L151-157)", () => {
  beforeEach(() => {
    clearRateLimitStore();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses 'Unknown AI error' when a non-Error value is thrown", async () => {
    process.env["NODE_ENV"] = "test"; // not development → no debugInfo
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });

    const res = await chatPOST(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let done = false;
    while (!done) {
      const result = await reader?.read();
      done = result?.done ?? true;
      if (result?.value) fullText += decoder.decode(result.value);
    }

    // Should have an error event with the safe message
    expect(fullText).toContain("error");
    expect(fullText).toContain("knowledge base");
    // debugInfo should NOT be present (non-development)
    expect(fullText).not.toContain("debugInfo");
  });

  it("includes debugInfo when NODE_ENV is development", async () => {
    process.env["NODE_ENV"] = "development"; // triggers debugInfo branch
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(validPayload),
    });

    const res = await chatPOST(req);
    expect(res.status).toBe(200);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let done = false;
    while (!done) {
      const result = await reader?.read();
      done = result?.done ?? true;
      if (result?.value) fullText += decoder.decode(result.value);
    }

    // In development mode, debugInfo should be included
    const events = fullText.split("\n\n")
      .filter(l => l.startsWith("data: "))
      .map(l => { try { return JSON.parse(l.substring(6)); } catch { return null; } })
      .filter(Boolean);

    const errorEvent = events.find((e: any) => e.type === "error");
    expect(errorEvent).toBeDefined();
    // debugInfo should be present in development
    expect(Object.keys(errorEvent)).toContain("debugInfo");
  });
});
