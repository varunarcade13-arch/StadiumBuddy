// ─── API Error Path Tests ──────────────────────────────────────────────────────
// Uses vi.mock to inject service failures into API route catch blocks.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { clearRateLimitStore } from "@/lib/middleware/rate-limiter";

// ─────────────────────────────────────────────────────────────────────────────
// Mock the services so we can force them to throw
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/services/services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/services")>();
  return {
    ...actual,
    // Override CrowdService to make getVenueCrowdStatus throw
    CrowdService: vi.fn().mockImplementation(() => ({
      getVenueCrowdStatus: vi.fn().mockRejectedValue(new Error("Crowd DB failure")),
      getZoneStatus: vi.fn().mockRejectedValue(new Error("Zone DB failure")),
      getCriticalZones: vi.fn().mockRejectedValue(new Error("Critical zones DB failure")),
      getCongestionScore: vi.fn().mockRejectedValue(new Error("Score DB failure")),
    })),
    // Override EmergencyService to make both methods throw
    EmergencyService: vi.fn().mockImplementation(() => ({
      getActiveAlerts: vi.fn().mockRejectedValue(new Error("Alert DB failure")),
      createAlert: vi.fn().mockRejectedValue(new Error("Create alert DB failure")),
      acknowledgeAlert: vi.fn().mockRejectedValue(new Error("Acknowledge DB failure")),
      isEmergencyActive: vi.fn().mockRejectedValue(new Error("Emergency check DB failure")),
    })),
    // Override TransportService to make getRecommendation throw
    TransportService: vi.fn().mockImplementation(() => ({
      getOptions: vi.fn().mockRejectedValue(new Error("Transport DB failure")),
      getRecommendation: vi.fn().mockRejectedValue(new Error("Recommendation DB failure")),
    })),
  };
});

// Import routes AFTER mocking, so they use the mocked service
const { GET: alertsGET, POST: alertsPOST } = await import("@/app/api/alerts/route");
const { GET: crowdGET } = await import("@/app/api/crowd/route");
const { GET: transportGET } = await import("@/app/api/transport/route");

describe("API routes – 500 error paths (service failures)", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it("GET /api/alerts returns 500 when service throws", async () => {
    const req = new NextRequest("http://localhost/api/alerts?venueId=metlife");
    const res = await alertsGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to retrieve alerts");
  });

  it("POST /api/alerts returns 500 when service throws", async () => {
    const payload = {
      venueId: "metlife", zoneId: null, category: "general",
      severity: "info", title: "Test", message: "Test msg",
      affectedZones: [], createdBy: "ops",
    };
    const req = new NextRequest("http://localhost/api/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const res = await alertsPOST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to create alert");
  });

  it("GET /api/crowd returns 500 when service throws", async () => {
    const req = new NextRequest("http://localhost/api/crowd?venueId=metlife");
    const res = await crowdGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to retrieve crowd data");
  });

  it("GET /api/transport returns 500 when service throws", async () => {
    const req = new NextRequest("http://localhost/api/transport?venueId=metlife");
    const res = await transportGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to retrieve transport data");
  });

  it("GET /api/transport recommendation returns 500 when service throws", async () => {
    const req = new NextRequest("http://localhost/api/transport?venueId=metlife&recommend=true");
    const res = await transportGET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("Failed to retrieve transport data");
  });
});
