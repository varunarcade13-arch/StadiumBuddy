// ─── Constants Unit Tests ──────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageConfig } from "@/lib/constants/languages";
import { ROUTES } from "@/lib/constants/routes";

describe("Language Constants", () => {
  it("defines supported languages correctly", () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(0);
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("gets language config by code", () => {
    const enConfig = getLanguageConfig("en");
    expect(enConfig.name).toBe("English");
    expect(enConfig.rtl).toBe(false);

    const arConfig = getLanguageConfig("ar");
    expect(arConfig.name).toBe("Arabic");
    expect(arConfig.rtl).toBe(true);
  });

  it("falls back to English for unsupported/invalid language code", () => {
    // Cast to any to test fallback behavior for unexpected inputs
    const fallbackConfig = getLanguageConfig("invalid" as any);
    expect(fallbackConfig.code).toBe("en");
  });
});

describe("Route Constants", () => {
  it("has valid route configuration", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.CHAT).toBe("/chat");
    expect(ROUTES.API.CHAT).toBe("/api/chat");
    expect(ROUTES.API.ALERTS).toBe("/api/alerts");
  });
});
