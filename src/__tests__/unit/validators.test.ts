// ─── Validator Unit Tests ──────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { chatRequestSchema, navigationRequestSchema, createAlertSchema } from "@/lib/validators/chat.validator";

describe("chatRequestSchema", () => {
  const validRequest = {
    message: "Where is Gate A?",
    sessionId: "123e4567-e89b-12d3-a456-426614174000",
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

  it("accepts a valid request", () => {
    const result = chatRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    const result = chatRequestSchema.safeParse({ ...validRequest, message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects message exceeding 1000 characters", () => {
    const result = chatRequestSchema.safeParse({ ...validRequest, message: "a".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid session ID (not UUID)", () => {
    const result = chatRequestSchema.safeParse({ ...validRequest, sessionId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported language", () => {
    const result = chatRequestSchema.safeParse({ ...validRequest, language: "xx" });
    expect(result.success).toBe(false);
  });

  it("accepts all supported languages", () => {
    const langs = ["en", "es", "fr", "ar", "pt", "de", "zh", "hi", "ja", "ko"] as const;
    for (const lang of langs) {
      const result = chatRequestSchema.safeParse({ ...validRequest, language: lang });
      expect(result.success).toBe(true);
    }
  });

  it("rejects history exceeding 40 entries", () => {
    const tooManyHistory = Array.from({ length: 41 }, () => ({ role: "user" as const, parts: ["hi"] }));
    const result = chatRequestSchema.safeParse({ ...validRequest, history: tooManyHistory });
    expect(result.success).toBe(false);
  });

  it("trims leading/trailing whitespace from message", () => {
    const result = chatRequestSchema.safeParse({ ...validRequest, message: "  hello  " });
    if (result.success) {
      expect(result.data.message).toBe("hello");
    }
  });

  it("uses default language if not provided", () => {
    const { language: _, ...withoutLang } = validRequest;
    const result = chatRequestSchema.safeParse(withoutLang);
    if (result.success) {
      expect(result.data.language).toBe("en");
    }
  });

  it("rejects dietary restrictions exceeding 10 items", () => {
    const result = chatRequestSchema.safeParse({
      ...validRequest,
      userPreferences: {
        ...validRequest.userPreferences,
        dietaryRestrictions: Array.from({ length: 11 }, (_, i) => `item${i}`),
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("navigationRequestSchema", () => {
  const validNav = {
    venueId: "metlife",
    fromWaypointId: "wp-main-gate",
    toWaypointId: "wp-food-a",
    accessible: false,
    avoidCrowdedZones: true,
  };

  it("accepts valid navigation request", () => {
    expect(navigationRequestSchema.safeParse(validNav).success).toBe(true);
  });

  it("rejects empty venueId", () => {
    expect(navigationRequestSchema.safeParse({ ...validNav, venueId: "" }).success).toBe(false);
  });

  it("rejects empty fromWaypointId", () => {
    expect(navigationRequestSchema.safeParse({ ...validNav, fromWaypointId: "" }).success).toBe(false);
  });

  it("defaults avoidCrowdedZones to true", () => {
    const { avoidCrowdedZones: _, ...partial } = validNav;
    const result = navigationRequestSchema.safeParse(partial);
    if (result.success) {
      expect(result.data.avoidCrowdedZones).toBe(true);
    }
  });
});

describe("createAlertSchema", () => {
  const validAlert = {
    venueId: "metlife",
    zoneId: null,
    category: "crowd",
    severity: "warning",
    title: "High Density at North Gate",
    message: "North Gate approaching maximum capacity",
    affectedZones: ["zone-north-entry"],
    createdBy: "ops-staff",
  };

  it("accepts valid alert", () => {
    expect(createAlertSchema.safeParse(validAlert).success).toBe(true);
  });

  it("rejects invalid category", () => {
    expect(createAlertSchema.safeParse({ ...validAlert, category: "unknown" }).success).toBe(false);
  });

  it("rejects invalid severity", () => {
    expect(createAlertSchema.safeParse({ ...validAlert, severity: "catastrophic" }).success).toBe(false);
  });

  it("rejects title exceeding 100 chars", () => {
    expect(createAlertSchema.safeParse({ ...validAlert, title: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects message exceeding 500 chars", () => {
    expect(createAlertSchema.safeParse({ ...validAlert, message: "x".repeat(501) }).success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const categories = ["crowd", "medical", "security", "fire", "weather", "transport", "general"] as const;
    for (const category of categories) {
      expect(createAlertSchema.safeParse({ ...validAlert, category }).success).toBe(true);
    }
  });

  it("accepts all valid severities", () => {
    const severities = ["info", "warning", "critical", "emergency"] as const;
    for (const severity of severities) {
      expect(createAlertSchema.safeParse({ ...validAlert, severity }).success).toBe(true);
    }
  });
});
