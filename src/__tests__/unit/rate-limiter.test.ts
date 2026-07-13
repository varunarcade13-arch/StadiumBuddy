// ─── Rate Limiter Middleware Unit Tests ────────────────────────────────────────

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitMiddleware,
  aiRateLimitMiddleware,
  clearRateLimitStore,
} from "@/lib/middleware/rate-limiter";

describe("Rate Limiter Middleware", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("checkRateLimit", () => {
    it("allows requests within limit and blocks when exceeded", () => {
      const key = "test-key";
      const config = { limit: 3, windowMs: 1000 };

      expect(checkRateLimit(key, config)).toBe(true);
      expect(checkRateLimit(key, config)).toBe(true);
      expect(checkRateLimit(key, config)).toBe(true);
      expect(checkRateLimit(key, config)).toBe(false);
    });

    it("resets limit count after window duration", async () => {
      const key = "reset-key";
      const config = { limit: 1, windowMs: 10 };

      expect(checkRateLimit(key, config)).toBe(true);
      expect(checkRateLimit(key, config)).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 15));

      expect(checkRateLimit(key, config)).toBe(true);
    });
  });

  describe("rateLimitMiddleware", () => {
    it("returns null when limit is not exceeded", () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=metlife", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const response = rateLimitMiddleware(req, "test-prefix");
      expect(response).toBeNull();
    });

    it("returns 429 response when limit is exceeded", () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=metlife", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });

      // Default limit is 60. Let's hit it 60 times.
      for (let i = 0; i < 60; i++) {
        rateLimitMiddleware(req, "test-prefix");
      }

      const blockResponse = rateLimitMiddleware(req, "test-prefix");
      expect(blockResponse).not.toBeNull();
      expect(blockResponse?.status).toBe(429);

      // Verify response headers and JSON body
      expect(blockResponse?.headers.get("X-RateLimit-Limit")).toBe("60");
      expect(blockResponse?.headers.get("Retry-After")).toBe("60");
    });

    it("falls back to 'unknown' IP if header is missing", () => {
      const req = new NextRequest("http://localhost/api/alerts?venueId=metlife");
      const response = rateLimitMiddleware(req, "test-prefix");
      expect(response).toBeNull();
    });
  });

  describe("aiRateLimitMiddleware", () => {
    it("applies strict rate limit (10 requests) and returns 429 when exceeded", () => {
      const req = new NextRequest("http://localhost/api/chat", {
        headers: { "x-forwarded-for": "10.0.0.1" },
      });

      // AI limit is 10
      for (let i = 0; i < 10; i++) {
        const response = aiRateLimitMiddleware(req);
        expect(response).toBeNull();
      }

      const blockResponse = aiRateLimitMiddleware(req);
      expect(blockResponse).not.toBeNull();
      expect(blockResponse?.status).toBe(429);
      expect(blockResponse?.headers.get("X-RateLimit-Limit")).toBe("10");
    });
  });
});
