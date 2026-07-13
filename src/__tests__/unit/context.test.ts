// ─── RAG Context Builder Tests ────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { buildRagContext, formatContextForPrompt } from "@/lib/gemini/context";
import { VENUES } from "@/lib/constants/venues";
import type { ZoneDensity } from "@/types/crowd.types";
import type { TransportOption } from "@/types/transport.types";
import type { Alert } from "@/types/alert.types";
import type { UserPreferences } from "@/types/chat.types";

const venue = VENUES[0]!;

const mockZones: ZoneDensity[] = [
  {
    zoneId: "zone-1", zoneName: "North Gate", density: 90, level: "critical",
    estimatedCount: 4500, capacity: 5000, trend: "increasing",
    updatedAt: new Date(), alertActive: true,
  },
];

const mockAlerts: Alert[] = [
  {
    id: "a1", venueId: "metlife", zoneId: null, category: "crowd",
    severity: "warning", title: "High Density", message: "North Gate busy",
    aiGuidance: "Use South Gate", affectedZones: [], evacuationRoute: null,
    isActive: true, createdAt: new Date(), expiresAt: null,
    acknowledgedBy: [], createdBy: "ops",
  },
];

const mockTransport: TransportOption[] = [
  {
    id: "t1", venueId: "metlife", mode: "metro", routeName: "Meadowlands Rail",
    destination: "Secaucus", departurePoint: "Station", estimatedWaitMinutes: 10,
    capacity: 1000, currentLoad: 60, nextDepartureAt: new Date(),
    frequency: "Every 20 min", accessible: true, priceUSD: 6,
  },
];

const defaultPrefs: UserPreferences = {
  mobilityAssistanceNeeded: false,
  preferredTransport: null,
  dietaryRestrictions: [],
  language: "en",
  seatingZone: null,
};

describe("buildRagContext", () => {
  it("builds context with venue info", () => {
    const ctx = buildRagContext({ venue, message: "Where is Gate A?", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.venueInfo).toContain("MetLife Stadium");
    expect(ctx.venueInfo).toContain("East Rutherford");
  });

  it("includes crowd data when provided", () => {
    const ctx = buildRagContext({ venue, message: "Is it crowded?", crowdZones: mockZones, activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.crowdStatus).toContain("North Gate");
    expect(ctx.crowdStatus).toContain("CRITICAL");
  });

  it("shows 'unavailable' when no crowd data", () => {
    const ctx = buildRagContext({ venue, message: "Is it crowded?", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.crowdStatus).toContain("unavailable");
  });

  it("includes active alerts", () => {
    const ctx = buildRagContext({ venue, message: "Any alerts?", crowdZones: [], activeAlerts: mockAlerts, transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.activeAlerts).toContain("High Density");
    expect(ctx.activeAlerts).toContain("WARNING");
  });

  it("shows 'No active alerts' when none", () => {
    const ctx = buildRagContext({ venue, message: "Any alerts?", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.activeAlerts).toContain("No active alerts");
  });

  it("includes transport options", () => {
    const ctx = buildRagContext({ venue, message: "Transport?", crowdZones: [], activeAlerts: [], transportOptions: mockTransport, userPreferences: defaultPrefs });
    expect(ctx.transportStatus).toContain("METRO");
    expect(ctx.transportStatus).toContain("Meadowlands Rail");
  });

  it("includes user preferences when set", () => {
    const ctx = buildRagContext({
      venue, message: "Help", crowdZones: [], activeAlerts: [], transportOptions: [],
      userPreferences: { ...defaultPrefs, mobilityAssistanceNeeded: true, seatingZone: "Section 115", preferredTransport: "metro" },
    });
    expect(ctx.userContext).toContain("mobility");
    expect(ctx.userContext).toContain("Section 115");
    expect(ctx.userContext).toContain("metro");
  });

  it("provides token estimate", () => {
    const ctx = buildRagContext({ venue, message: "test", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    expect(ctx.tokenEstimate).toBeGreaterThan(0);
  });

  it("retrieves relevant FAQs based on message keywords", () => {
    const ctx = buildRagContext({ venue, message: "Where are accessible restrooms?", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    // Should contain accessibility FAQ
    expect(ctx.relevantFaqs.length).toBeGreaterThan(0);
  });
});

describe("formatContextForPrompt", () => {
  it("formats context into structured markdown", () => {
    const ctx = buildRagContext({ venue, message: "test", crowdZones: [], activeAlerts: [], transportOptions: [], userPreferences: defaultPrefs });
    const formatted = formatContextForPrompt(ctx);
    expect(formatted).toContain("## Current Stadium Context");
    expect(formatted).toContain("### Venue Information");
    expect(formatted).toContain("### Live Crowd Status");
    expect(formatted).toContain("### Active Alerts");
    expect(formatted).toContain("### Transport Options");
    expect(formatted).toContain("### User Profile");
  });
});
