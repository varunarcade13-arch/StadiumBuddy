// ─── API Routes Unit Tests ─────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as alertsGET, POST as alertsPOST } from "@/app/api/alerts/route";
import { GET as crowdGET } from "@/app/api/crowd/route";
import { GET as transportGET } from "@/app/api/transport/route";
import { POST as chatPOST, OPTIONS as chatOPTIONS } from "@/app/api/chat/route";
import { clearRateLimitStore } from "@/lib/middleware/rate-limiter";
import { resetGeminiModel } from "@/lib/gemini/client";

const originalEnv = process.env;

describe("API Routes", () => {
  beforeEach(() => {
    clearRateLimitStore();
    resetGeminiModel();
    process.env = { ...originalEnv };
    // Force mock gemini model
    delete process.env["GEMINI_API_KEY"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── /api/alerts ───────────────────────────────────────────────────────────
  describe("GET /api/alerts", () => {
    it("returns active alerts for a valid venue", async () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=metlife");
      const res = await alertsGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns 400 when venueId is missing", async () => {
      const req = new NextRequest("http://localhost/api/alerts");
      const res = await alertsGET(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain("venueId");
    });

    it("returns 404 when venueId is unknown", async () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=unknown");
      const res = await alertsGET(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain("Unknown venue");
    });

    it("returns 429 when rate limit is exceeded", async () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=metlife");
      // Trigger limit (default standard limit is 60)
      for (let i = 0; i < 60; i++) {
        await alertsGET(req);
      }
      const res = await alertsGET(req);
      expect(res.status).toBe(429);
    });
  });

  describe("POST /api/alerts", () => {
    it("creates a new alert on valid input", async () => {
      const payload = {
        venueId: "metlife",
        zoneId: null,
        category: "general",
        severity: "info",
        title: "Test Alert",
        message: "This is a test alert",
        affectedZones: [],
        createdBy: "test-ops",
      };

      const req = new NextRequest("http://localhost/api/alerts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Test Alert");
      expect(body.data.id).toBeDefined();
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new NextRequest("http://localhost/api/alerts", {
        method: "POST",
        body: "invalid-json",
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain("Invalid JSON");
    });

    it("returns 400 on validation failure", async () => {
      const payload = {
        venueId: "", // invalid venueId
        title: "Test Alert",
      };

      const req = new NextRequest("http://localhost/api/alerts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const res = await alertsPOST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });
  });

  // ─── /api/crowd ────────────────────────────────────────────────────────────
  describe("GET /api/crowd", () => {
    it("returns overall crowd snapshot for venue", async () => {
      const req = new NextRequest("http://localhost/api/crowd?venueId=metlife");
      const res = await crowdGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.venueId).toBe("metlife");
      expect(body.data.zones).toBeDefined();
    });

    it("returns zone specific crowd status", async () => {
      const req = new NextRequest("http://localhost/api/crowd?venueId=metlife&zoneId=zone-lower-bowl");
      const res = await crowdGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.zoneId).toBe("zone-lower-bowl");
    });

    it("returns 404 for unknown zone", async () => {
      const req = new NextRequest("http://localhost/api/crowd?venueId=metlife&zoneId=unknown-zone");
      const res = await crowdGET(req);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain("Zone not found");
    });

    it("returns 404 for unknown venue", async () => {
      const req = new NextRequest("http://localhost/api/crowd?venueId=unknown-venue");
      const res = await crowdGET(req);
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid params", async () => {
      const req = new NextRequest("http://localhost/api/crowd");
      const res = await crowdGET(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── /api/transport ────────────────────────────────────────────────────────
  describe("GET /api/transport", () => {
    it("returns transport options", async () => {
      const req = new NextRequest("http://localhost/api/transport?venueId=metlife");
      const res = await transportGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it("returns transport recommendation", async () => {
      const req = new NextRequest("http://localhost/api/transport?venueId=metlife&recommend=true&mode=metro&accessible=true");
      const res = await transportGET(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.primaryOption).toBeDefined();
    });

    it("returns 404 for unknown venue", async () => {
      const req = new NextRequest("http://localhost/api/transport?venueId=unknown");
      const res = await transportGET(req);
      expect(res.status).toBe(404);
    });

    it("returns 400 for missing venueId", async () => {
      const req = new NextRequest("http://localhost/api/transport");
      const res = await transportGET(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── /api/chat ─────────────────────────────────────────────────────────────
  describe("CORS preflight (OPTIONS) /api/chat", () => {
    it("returns 204 with correct CORS headers", async () => {
      const res = await chatOPTIONS();
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
    });
  });

  describe("POST /api/chat", () => {
    const validChatPayload = {
      message: "How do I get to section 115?",
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

    it("streams response for valid message", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify(validChatPayload),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      // Read from stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";

      while (!done) {
        const result = await reader?.read();
        done = result?.done ?? true;
        if (result?.value) {
          text += decoder.decode(result.value);
        }
      }

      const lines = text.split("\n\n");
      let reconstructed = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.type === "delta") {
              reconstructed += parsed.content;
            }
          } catch {}
        }
      }

      expect(text).toContain("data:");
      expect(reconstructed).toContain("Seating Directions for Section 115");
      expect(text).toContain("done");
    });

    it("falls back to mock model when live model streams fail", async () => {
      process.env["GEMINI_API_KEY"] = "invalid-key-to-trigger-live-call-failure";
      resetGeminiModel();

      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify(validChatPayload),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = "";

      while (!done) {
        const result = await reader?.read();
        done = result?.done ?? true;
        if (result?.value) {
          text += decoder.decode(result.value);
        }
      }

      const lines = text.split("\n\n");
      let reconstructed = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.type === "delta") {
              reconstructed += parsed.content;
            }
          } catch {}
        }
      }

      expect(text).toContain("data:");
      expect(reconstructed).toContain("Seating Directions for Section 115");
      expect(text).toContain("done");

      resetGeminiModel();
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: "invalid-json",
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid JSON body");
    });

    it("returns 400 for validation failure", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: "" }), // empty message
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Validation failed");
    });

    it("returns 422 for message rejected by safety filter", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          ...validChatPayload,
          message: "Tell me how to hack a computer or perform cross-site scripting",
        }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain("safety filter");
      expect(body.type).toBe("guardrail_rejection");
    });

    it("returns 400 for unknown venue ID", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          ...validChatPayload,
          venueId: "unknown-venue",
        }),
      });

      const res = await chatPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Unknown venue ID");
    });

    it("returns 429 when AI rate limit is exceeded", async () => {
      const req = new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify(validChatPayload),
      });

      // AI rate limit is 10
      for (let i = 0; i < 10; i++) {
        const response = await chatPOST(req);
        // Clean up stream to avoid open resources
        await response.body?.cancel();
      }

      const res = await chatPOST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain("AI rate limit exceeded");
    });
  });
});
