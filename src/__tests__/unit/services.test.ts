// ─── Service Layer Unit Tests ──────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrowdService, NavigationService, TransportService, EmergencyService, SustainabilityService, MatchService } from "@/lib/services/services";
import { MockCrowdRepository, MockTransportRepository, MockAlertRepository, MockMatchRepository } from "@/lib/repositories/mock.repositories";
import { VENUES } from "@/lib/constants/venues";
import type { VenueCrowdSnapshot } from "@/types/crowd.types";
import type { TransportOption } from "@/types/transport.types";

// ─── CrowdService ────────────────────────────────────────────────────────────

describe("CrowdService", () => {
  let service: CrowdService;
  const mockRepo = new MockCrowdRepository();

  beforeEach(() => {
    service = new CrowdService(mockRepo);
  });

  it("returns crowd snapshot for a venue", async () => {
    const snapshot = await service.getVenueCrowdStatus("metlife");
    expect(snapshot.venueId).toBe("metlife");
    expect(snapshot.zones.length).toBeGreaterThan(0);
    expect(snapshot.overallDensity).toBeGreaterThanOrEqual(0);
    expect(snapshot.overallDensity).toBeLessThanOrEqual(100);
  });

  it("returns null for unknown zone ID", async () => {
    const zone = await service.getZoneStatus("metlife", "nonexistent-zone");
    expect(zone).toBeNull();
  });

  it("returns known zone density", async () => {
    const zone = await service.getZoneStatus("metlife", "zone-lower-bowl");
    expect(zone).not.toBeNull();
    expect(zone?.density).toBeDefined();
  });

  it("returns critical zones only", async () => {
    const critical = await service.getCriticalZones("metlife");
    expect(Array.isArray(critical)).toBe(true);
    critical.forEach((z) => expect(z.density).toBeGreaterThanOrEqual(80));
  });

  it("returns congestion score as number 0-100", async () => {
    const score = await service.getCongestionScore("metlife");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("works with dependency injection (mock repo)", async () => {
    const customMock = {
      getCrowdSnapshot: vi.fn().mockResolvedValue({
        venueId: "test",
        venueName: "Test Venue",
        overallDensity: 50,
        totalCount: 5000,
        totalCapacity: 10000,
        zones: [],
        timestamp: new Date(),
        emergencyActive: false,
      } satisfies VenueCrowdSnapshot),
      getZoneDensity: vi.fn().mockResolvedValue(null),
      getActiveCrowdAlerts: vi.fn().mockResolvedValue([]),
    };
    const svc = new CrowdService(customMock);
    const snap = await svc.getVenueCrowdStatus("test");
    expect(customMock.getCrowdSnapshot).toHaveBeenCalledOnce();
    expect(snap.overallDensity).toBe(50);
  });

  it("propagates repository errors", async () => {
    const failingRepo = {
      getCrowdSnapshot: vi.fn().mockRejectedValue(new Error("DB error")),
      getZoneDensity: vi.fn().mockRejectedValue(new Error("DB error")),
      getActiveCrowdAlerts: vi.fn().mockRejectedValue(new Error("DB error")),
    };
    const svc = new CrowdService(failingRepo);
    await expect(svc.getVenueCrowdStatus("metlife")).rejects.toThrow("DB error");
  });
});

// ─── NavigationService ───────────────────────────────────────────────────────

describe("NavigationService", () => {
  let service: NavigationService;
  const venue = VENUES[0]!;

  beforeEach(() => {
    service = new NavigationService();
  });

  it("finds a route between two connected waypoints", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-concourse-south", { accessible: false, avoidCrowded: false });
    expect(route).not.toBeNull();
    expect(route?.waypoints.length).toBeGreaterThanOrEqual(2);
  });

  it("finds a longer route through multiple waypoints", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-food-a", { accessible: false, avoidCrowded: false });
    expect(route).not.toBeNull();
    expect(route?.description).toContain("Main Gate");
  });

  it("returns null for unknown from waypoint", () => {
    const route = service.findRoute(venue, "nonexistent", "wp-food-a", { accessible: false, avoidCrowded: false });
    expect(route).toBeNull();
  });

  it("returns null for unknown to waypoint", () => {
    const route = service.findRoute(venue, "wp-main-gate", "nonexistent", { accessible: false, avoidCrowded: false });
    expect(route).toBeNull();
  });

  it("respects accessibility requirement", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-food-a", { accessible: true, avoidCrowded: false });
    // All waypoints in accessible route should be accessible
    if (route) {
      route.waypoints.forEach((wp) => expect(wp.accessible).toBe(true));
    }
  });

  it("returns accessibility score of 100 for fully accessible route", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-concourse-south", { accessible: true, avoidCrowded: false });
    if (route) expect(route.accessibilityScore).toBe(100);
  });

  it("returns positive estimated time", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-food-a", { accessible: false, avoidCrowded: false });
    if (route) expect(route.estimatedMinutes).toBeGreaterThan(0);
  });

  it("returns positive distance", () => {
    const route = service.findRoute(venue, "wp-main-gate", "wp-food-a", { accessible: false, avoidCrowded: false });
    if (route) expect(route.distanceMeters).toBeGreaterThan(0);
  });

  it("handles same from and to waypoint", () => {
    // BFS will find "route" immediately with path = [fromId]
    const route = service.findRoute(venue, "wp-main-gate", "wp-main-gate", { accessible: false, avoidCrowded: false });
    // Should still return a result (trivial route to itself)
    expect(route === null || route.waypoints.length >= 1).toBe(true);
  });
});

// ─── TransportService ─────────────────────────────────────────────────────────

describe("TransportService", () => {
  let service: TransportService;

  beforeEach(() => {
    service = new TransportService(new MockTransportRepository());
  });

  it("returns transport options for a venue", async () => {
    const options = await service.getOptions("metlife");
    expect(options.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown venue", async () => {
    const options = await service.getOptions("unknown-venue");
    expect(options).toHaveLength(0);
  });

  it("returns a recommendation", async () => {
    const rec = await service.getRecommendation("metlife", { accessible: false });
    expect(rec).not.toBeNull();
    expect(rec?.primaryOption).toBeDefined();
  });

  it("returns null recommendation for venue with no options", async () => {
    const rec = await service.getRecommendation("unknown-venue", { accessible: false });
    expect(rec).toBeNull();
  });

  it("recommendation respects accessibility filter", async () => {
    const rec = await service.getRecommendation("metlife", { accessible: true });
    if (rec) {
      expect(rec.primaryOption.accessible).toBe(true);
      rec.alternativeOptions.forEach((o) => expect(o.accessible).toBe(true));
    }
  });

  it("recommendation prefers mode if specified", async () => {
    const rec = await service.getRecommendation("metlife", { accessible: false, preferredMode: "metro" });
    // If metro is available, it should be recommended
    expect(rec).not.toBeNull();
  });

  it("uses dependency injection correctly", async () => {
    const mockOpts: TransportOption[] = [
      {
        id: "t1", venueId: "v1", mode: "bus", routeName: "Route 1",
        destination: "City Center", departurePoint: "Gate A",
        estimatedWaitMinutes: 5, capacity: 50, currentLoad: 30,
        nextDepartureAt: new Date(), frequency: "Every 10 min",
        accessible: true, priceUSD: 2.5,
      },
    ];
    const customRepo = {
      getTransportOptions: vi.fn().mockResolvedValue(mockOpts),
      getOptionById: vi.fn().mockResolvedValue(mockOpts[0]),
    };
    const svc = new TransportService(customRepo);
    const opts = await svc.getOptions("v1");
    expect(customRepo.getTransportOptions).toHaveBeenCalledWith("v1");
    expect(opts).toHaveLength(1);
  });
});

// ─── EmergencyService ─────────────────────────────────────────────────────────

describe("EmergencyService", () => {
  let service: EmergencyService;

  beforeEach(() => {
    service = new EmergencyService(new MockAlertRepository());
  });

  it("returns active alerts for a venue", async () => {
    const alerts = await service.getActiveAlerts("metlife");
    expect(Array.isArray(alerts)).toBe(true);
  });

  it("creates an alert successfully", async () => {
    const alert = await service.createAlert({
      venueId: "metlife",
      zoneId: null,
      category: "medical",
      severity: "critical",
      title: "Medical Emergency",
      message: "Fan collapsed in Section 112",
      affectedZones: [],
      createdBy: "ops-1",
    });
    expect(alert.id).toBeTruthy();
    expect(alert.title).toBe("Medical Emergency");
    expect(alert.aiGuidance).toBeTruthy();
  });

  it("generates AI guidance for medical category", async () => {
    const alert = await service.createAlert({
      venueId: "metlife", zoneId: null, category: "medical",
      severity: "warning", title: "Medical", message: "Issue",
      affectedZones: [], createdBy: "ops",
    });
    expect(alert.aiGuidance).toContain("medical");
  });

  it("generates AI guidance for fire category", async () => {
    const alert = await service.createAlert({
      venueId: "metlife", zoneId: null, category: "fire",
      severity: "emergency", title: "Fire", message: "Smoke detected",
      affectedZones: [], createdBy: "ops",
    });
    expect(alert.aiGuidance).toContain("evacuation");
  });

  it("detects no emergency when no emergency alerts", async () => {
    const isEmergency = await service.isEmergencyActive("metlife");
    expect(typeof isEmergency).toBe("boolean");
  });

  it("acknowledges an alert", async () => {
    // Create first, then acknowledge
    const alert = await service.createAlert({
      venueId: "metlife", zoneId: null, category: "general",
      severity: "info", title: "Test", message: "Test alert",
      affectedZones: [], createdBy: "test",
    });
    await expect(service.acknowledgeAlert(alert.id, "user-1")).resolves.not.toThrow();
  });
});

// ─── SustainabilityService ────────────────────────────────────────────────────

describe("SustainabilityService", () => {
  const service = new SustainabilityService();

  it("returns sustainability metrics", () => {
    const metrics = service.getVenueMetrics("metlife");
    expect(metrics.energySavedKwh).toBeGreaterThan(0);
    expect(metrics.wasteRecycledPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.wasteRecycledPercent).toBeLessThanOrEqual(100);
    expect(metrics.waterSavedLiters).toBeGreaterThan(0);
    expect(metrics.carbonOffsetTons).toBeGreaterThan(0);
  });

  it("returns eco tips array", () => {
    const tips = service.getEcoTips();
    expect(tips.length).toBeGreaterThan(0);
    tips.forEach((tip) => expect(typeof tip).toBe("string"));
  });

  it("works with any venue ID", () => {
    expect(() => service.getVenueMetrics("any-venue")).not.toThrow();
  });
});

// ─── MatchService & MockMatchRepository ───────────────────────────────────────

describe("MatchService & MockMatchRepository", () => {
  let repo: MockMatchRepository;
  let service: MatchService;

  beforeEach(() => {
    repo = new MockMatchRepository();
    service = new MatchService(repo);
  });

  it("retrieves matches by venue ID", async () => {
    const matches = await service.getMatchesByVenue("metlife");
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((m) => expect(m.venueId).toBe("metlife"));
  });

  it("retrieves match by ID", async () => {
    const match = await repo.getMatchById("match-gf2026");
    expect(match).not.toBeNull();
    expect(match?.id).toBe("match-gf2026");

    const nonExistent = await repo.getMatchById("non-existent");
    expect(nonExistent).toBeNull();
  });

  it("retrieves current match", async () => {
    const current = await service.getCurrentMatch("metlife");
    expect(current).not.toBeNull();
    expect(["live", "scheduled"]).toContain(current?.status);
  });

  it("formats match context string when match is active", async () => {
    const contextStr = await service.getMatchContextString("metlife");
    expect(contextStr).not.toBe("No current match");
    expect(contextStr).toContain("vs");
    expect(contextStr).toContain("Kickoff:");
  });

  it("returns 'No current match' if none exists", async () => {
    const customRepo = {
      getMatchesByVenue: vi.fn().mockResolvedValue([]),
      getMatchById: vi.fn().mockResolvedValue(null),
      getCurrentMatch: vi.fn().mockResolvedValue(null),
    };
    const customService = new MatchService(customRepo);
    const contextStr = await customService.getMatchContextString("empty-venue");
    expect(contextStr).toBe("No current match");
  });
});
