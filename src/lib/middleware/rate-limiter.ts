// ─── Rate Limiter Middleware ────────────────────────────────────────────────────
// Simple in-memory rate limiter for Next.js Route Handlers.
// In production, use Redis (Upstash) for distributed rate limiting.

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Max requests per window */
  readonly limit: number;
  /** Window duration in ms */
  readonly windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 60,
  windowMs: 60 * 1000, // 1 minute
};

const AI_ROUTE_CONFIG: RateLimitConfig = {
  limit: 10,
  windowMs: 60 * 1000, // 10 AI calls per minute
};

/**
 * Extracts a rate limit key from the request.
 * Uses X-Forwarded-For header first, falls back to a generic key.
 */
function getRateLimitKey(request: NextRequest, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Checks and updates the rate limit for a given key.
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, config: RateLimitConfig = DEFAULT_CONFIG): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (existing.count >= config.limit) {
    return false;
  }

  store.set(key, { count: existing.count + 1, resetAt: existing.resetAt });
  return true;
}

/**
 * Rate limiter middleware for standard API routes.
 * Returns NextResponse if rate limited, null if allowed.
 */
export function rateLimitMiddleware(
  request: NextRequest,
  prefix = "api"
): NextResponse | null {
  const key = getRateLimitKey(request, prefix);
  const allowed = checkRateLimit(key, DEFAULT_CONFIG);

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "You have exceeded the rate limit. Please wait a moment before trying again.",
        retryAfterMs: DEFAULT_CONFIG.windowMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(DEFAULT_CONFIG.windowMs / 1000),
          "X-RateLimit-Limit": String(DEFAULT_CONFIG.limit),
        },
      }
    );
  }

  return null;
}

/**
 * Rate limiter for AI chat routes (stricter limits).
 */
export function aiRateLimitMiddleware(request: NextRequest): NextResponse | null {
  const key = getRateLimitKey(request, "ai");
  const allowed = checkRateLimit(key, AI_ROUTE_CONFIG);

  if (!allowed) {
    return NextResponse.json(
      {
        error: "AI rate limit exceeded",
        message:
          "You have made too many AI requests. Please wait 60 seconds before trying again.",
        retryAfterMs: AI_ROUTE_CONFIG.windowMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(AI_ROUTE_CONFIG.windowMs / 1000),
          "X-RateLimit-Limit": String(AI_ROUTE_CONFIG.limit),
        },
      }
    );
  }

  return null;
}

/** Clears the rate limit store (for testing only) */
export function clearRateLimitStore(): void {
  store.clear();
}
