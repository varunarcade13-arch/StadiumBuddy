// ─── Mock Data Repositories ────────────────────────────────────────────────────
// Clean Architecture: Repository pattern with interfaces and mock implementations.

import type { ZoneDensity, VenueCrowdSnapshot, CrowdAlert } from "@/types/crowd.types";
import type { TransportOption } from "@/types/transport.types";
import type { Alert } from "@/types/alert.types";
import type { Match } from "@/types/venue.types";
import { VENUES } from "@/lib/constants/venues";

// ─── Repository Interfaces (Dependency Inversion Principle) ───────────────────

/** Contract for crowd data access */
export interface ICrowdRepository {
  getCrowdSnapshot(venueId: string): Promise<VenueCrowdSnapshot>;
  getZoneDensity(venueId: string, zoneId: string): Promise<ZoneDensity | null>;
  getActiveCrowdAlerts(venueId: string): Promise<readonly CrowdAlert[]>;
}

/** Contract for transport data access */
export interface ITransportRepository {
  getTransportOptions(venueId: string): Promise<readonly TransportOption[]>;
  getOptionById(id: string): Promise<TransportOption | null>;
}

/** Contract for alert management */
export interface IAlertRepository {
  getActiveAlerts(venueId: string): Promise<readonly Alert[]>;
  createAlert(alert: Omit<Alert, "id" | "createdAt">): Promise<Alert>;
  acknowledgeAlert(alertId: string, userId: string): Promise<void>;
}

/** Contract for match data access */
export interface IMatchRepository {
  getMatchesByVenue(venueId: string): Promise<readonly Match[]>;
  getMatchById(id: string): Promise<Match | null>;
  getCurrentMatch(venueId: string): Promise<Match | null>;
}

// ─── Mock Crowd Repository ────────────────────────────────────────────────────

/** Generates realistic mock crowd data */
function generateMockZone(
  zoneId: string,
  zoneName: string,
  density: number,
  capacity: number
): ZoneDensity {
  const level: ZoneDensity["level"] =
    density >= 85 ? "critical" : density >= 65 ? "high" : density >= 35 ? "moderate" : "low";
  return {
    zoneId,
    zoneName,
    density,
    level,
    estimatedCount: Math.round((density / 100) * capacity),
    capacity,
    trend: density > 70 ? "increasing" : density < 30 ? "decreasing" : "stable",
    updatedAt: new Date(),
    alertActive: density >= 85,
  };
}

// Per-venue crowd zone templates
const CROWD_ZONE_TEMPLATES: Record<string, Array<{ id: string; name: string; density: number; capacity: number }>> = {
  metlife: [
    { id: "zone-north-entry", name: "North Entry Plaza", density: 82, capacity: 5000 },
    { id: "zone-south-entry", name: "South Entry Plaza", density: 45, capacity: 5000 },
    { id: "zone-lower-bowl", name: "Lower Bowl", density: 91, capacity: 40000 },
    { id: "zone-upper-deck", name: "Upper Deck", density: 76, capacity: 30000 },
    { id: "zone-food-court-a", name: "Food Court A", density: 68, capacity: 2000 },
    { id: "zone-medical", name: "Medical Center", density: 12, capacity: 100 },
  ],
  sofistadium: [
    { id: "zone-main-floor", name: "Main Floor", density: 78, capacity: 10000 },
    { id: "zone-club-level", name: "Club Level", density: 55, capacity: 15000 },
    { id: "zone-north-terrace", name: "North Terrace", density: 88, capacity: 20000 },
    { id: "zone-south-terrace", name: "South Terrace", density: 40, capacity: 20000 },
    { id: "zone-concessions", name: "Concessions Row", density: 62, capacity: 3000 },
    { id: "zone-medical-sofi", name: "Medical Center", density: 8, capacity: 100 },
  ],
  dallascowboys: [
    { id: "zone-main-concourse", name: "Main Concourse", density: 70, capacity: 12000 },
    { id: "zone-upper-bowl", name: "Upper Bowl", density: 85, capacity: 35000 },
    { id: "zone-lower-bowl-att", name: "Lower Bowl", density: 95, capacity: 30000 },
    { id: "zone-east-plaza", name: "East Plaza", density: 50, capacity: 4000 },
    { id: "zone-west-plaza", name: "West Plaza", density: 35, capacity: 4000 },
    { id: "zone-medical-att", name: "Medical Center", density: 15, capacity: 100 },
  ],
};

export class MockCrowdRepository implements ICrowdRepository {
  async getCrowdSnapshot(venueId: string): Promise<VenueCrowdSnapshot> {
    let venue = null;
    for (let i = 0; i < VENUES.length; i++) {
      const v = VENUES[i];
      if (v && v.id === venueId) {
        venue = v;
        break;
      }
    }
    const venueName = venue?.name ?? "Unknown Stadium";

    // Use venue-specific zone data, falling back to metlife template
    const zoneTemplate = CROWD_ZONE_TEMPLATES[venueId] ?? CROWD_ZONE_TEMPLATES["metlife"]!;
    const zones: ZoneDensity[] = [];
    let totalCount = 0;
    let totalCapacity = 0;
    for (let i = 0; i < zoneTemplate.length; i++) {
      const t = zoneTemplate[i];
      if (t) {
        const z = generateMockZone(t.id, t.name, t.density, t.capacity);
        zones.push(z);
        totalCount += z.estimatedCount;
        totalCapacity += z.capacity;
      }
    }

    return {
      venueId,
      venueName,
      overallDensity: Math.round((totalCount / totalCapacity) * 100),
      totalCount,
      totalCapacity,
      zones,
      timestamp: new Date(),
      emergencyActive: false,
    };
  }

  async getZoneDensity(venueId: string, zoneId: string): Promise<ZoneDensity | null> {
    const snapshot = await this.getCrowdSnapshot(venueId);
    const zones = snapshot.zones;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (z && z.zoneId === zoneId) {
        return z;
      }
    }
    return null;
  }

  async getActiveCrowdAlerts(venueId: string): Promise<readonly CrowdAlert[]> {
    void venueId; // used for real implementation
    return [
      {
        alertId: "alert-crowd-1",
        zoneId: "zone-north-entry",
        zoneName: "North Entry Plaza",
        severity: "warning",
        message: "North Entry Plaza approaching high density. Consider routing fans via South Entry.",
        aiRecommendation:
          "Redirect incoming fans to South Entry Plaza. Estimated wait time at South Entry: 4 minutes vs 18 minutes at North.",
        triggeredAt: new Date(Date.now() - 10 * 60 * 1000),
        resolvedAt: null,
        acknowledgedBy: null,
      },
    ];
  }
}

// ─── Mock Transport Repository ────────────────────────────────────────────────

export class MockTransportRepository implements ITransportRepository {
  private readonly options: readonly TransportOption[] = [
    // ── MetLife Stadium (NJ) ─────────────────────────────────────────────────
    {
      id: "transport-nj-transit",
      venueId: "metlife",
      mode: "bus",
      routeName: "NJ Transit 351",
      destination: "Port Authority Bus Terminal",
      departurePoint: "Lot G Shuttle Stop",
      estimatedWaitMinutes: 8,
      capacity: 80,
      currentLoad: 55,
      nextDepartureAt: new Date(Date.now() + 8 * 60 * 1000),
      frequency: "Every 12 minutes",
      accessible: true,
      priceUSD: 4.25,
    },
    {
      id: "transport-meadowlands-rail",
      venueId: "metlife",
      mode: "metro",
      routeName: "Meadowlands Rail Line",
      destination: "Secaucus Junction (transfers to NJ Transit/Amtrak)",
      departurePoint: "Meadowlands Station (8-min walk from Stadium)",
      estimatedWaitMinutes: 15,
      capacity: 1000,
      currentLoad: 72,
      nextDepartureAt: new Date(Date.now() + 15 * 60 * 1000),
      frequency: "Every 20 minutes on game days",
      accessible: true,
      priceUSD: 6.0,
    },
    {
      id: "transport-rideshare-metlife",
      venueId: "metlife",
      mode: "rideshare",
      routeName: "Rideshare Zone A",
      destination: "User-specified",
      departurePoint: "Rideshare Zone – Lot A",
      estimatedWaitMinutes: 25,
      capacity: 4,
      currentLoad: 0,
      nextDepartureAt: new Date(Date.now() + 25 * 60 * 1000),
      frequency: "On demand",
      accessible: false,
      priceUSD: null,
    },
    {
      id: "transport-shuttle-nyc",
      venueId: "metlife",
      mode: "shuttle",
      routeName: "NYC Express Shuttle",
      destination: "Penn Station New York",
      departurePoint: "Gate B Shuttle Area",
      estimatedWaitMinutes: 5,
      capacity: 55,
      currentLoad: 80,
      nextDepartureAt: new Date(Date.now() + 5 * 60 * 1000),
      frequency: "Every 15 minutes",
      accessible: true,
      priceUSD: 15.0,
    },
    // ── SoFi Stadium (Los Angeles) ───────────────────────────────────────────
    {
      id: "transport-sofi-metro-k",
      venueId: "sofistadium",
      mode: "metro",
      routeName: "Metro K Line (Crenshaw)",
      destination: "Downtown Los Angeles (7th/Metro Center)",
      departurePoint: "Westchester/Veterans Station (10-min walk)",
      estimatedWaitMinutes: 10,
      capacity: 800,
      currentLoad: 65,
      nextDepartureAt: new Date(Date.now() + 10 * 60 * 1000),
      frequency: "Every 8 minutes on game days",
      accessible: true,
      priceUSD: 1.75,
    },
    {
      id: "transport-sofi-lax-shuttle",
      venueId: "sofistadium",
      mode: "shuttle",
      routeName: "LAX Express Shuttle",
      destination: "Los Angeles International Airport (LAX)",
      departurePoint: "Gate A Shuttle Bay",
      estimatedWaitMinutes: 7,
      capacity: 55,
      currentLoad: 72,
      nextDepartureAt: new Date(Date.now() + 7 * 60 * 1000),
      frequency: "Every 20 minutes",
      accessible: true,
      priceUSD: 12.0,
    },
    {
      id: "transport-sofi-rideshare",
      venueId: "sofistadium",
      mode: "rideshare",
      routeName: "Rideshare Drop Zone",
      destination: "User-specified",
      departurePoint: "Rideshare Zone – Hollywood Park Lot 4",
      estimatedWaitMinutes: 30,
      capacity: 4,
      currentLoad: 0,
      nextDepartureAt: new Date(Date.now() + 30 * 60 * 1000),
      frequency: "On demand",
      accessible: false,
      priceUSD: null,
    },
    {
      id: "transport-sofi-bus-733",
      venueId: "sofistadium",
      mode: "bus",
      routeName: "Metro Bus 733",
      destination: "Venice Beach / Santa Monica",
      departurePoint: "Stadium Dr & Arbor Vitae St",
      estimatedWaitMinutes: 12,
      capacity: 60,
      currentLoad: 40,
      nextDepartureAt: new Date(Date.now() + 12 * 60 * 1000),
      frequency: "Every 15 minutes",
      accessible: true,
      priceUSD: 1.75,
    },
    // ── AT&T Stadium (Dallas / Arlington) ───────────────────────────────────
    {
      id: "transport-att-arlington-express",
      venueId: "dallascowboys",
      mode: "shuttle",
      routeName: "Arlington Express Shuttle",
      destination: "Dallas Fort Worth Airport (DFW)",
      departurePoint: "Gate F Shuttle Area",
      estimatedWaitMinutes: 6,
      capacity: 55,
      currentLoad: 60,
      nextDepartureAt: new Date(Date.now() + 6 * 60 * 1000),
      frequency: "Every 15 minutes",
      accessible: true,
      priceUSD: 10.0,
    },
    {
      id: "transport-att-rideshare",
      venueId: "dallascowboys",
      mode: "rideshare",
      routeName: "Rideshare Zone B",
      destination: "User-specified",
      departurePoint: "Rideshare Pickup – Lot 1 (East Side)",
      estimatedWaitMinutes: 20,
      capacity: 4,
      currentLoad: 0,
      nextDepartureAt: new Date(Date.now() + 20 * 60 * 1000),
      frequency: "On demand",
      accessible: false,
      priceUSD: null,
    },
    {
      id: "transport-att-bus-dart",
      venueId: "dallascowboys",
      mode: "bus",
      routeName: "DART Game Day Express",
      destination: "Dallas Union Station",
      departurePoint: "South Parking Lot Bus Stop",
      estimatedWaitMinutes: 18,
      capacity: 80,
      currentLoad: 55,
      nextDepartureAt: new Date(Date.now() + 18 * 60 * 1000),
      frequency: "Every 30 minutes on game days",
      accessible: true,
      priceUSD: 3.0,
    },
    {
      id: "transport-att-parking",
      venueId: "dallascowboys",
      mode: "walking",
      routeName: "On-Site Parking (Self)",
      destination: "Stadium exit routes",
      departurePoint: "Lots 1-8 (self-park)",
      estimatedWaitMinutes: 35,
      capacity: 12000,
      currentLoad: 88,
      nextDepartureAt: new Date(Date.now() + 35 * 60 * 1000),
      frequency: "Exit as you go",
      accessible: true,
      priceUSD: 25.0,
    },
  ];

  async getTransportOptions(venueId: string): Promise<readonly TransportOption[]> {
    const res: TransportOption[] = [];
    const len = this.options.length;
    for (let i = 0; i < len; i++) {
      const o = this.options[i];
      if (o && o.venueId === venueId) {
        res.push(o);
      }
    }
    return res;
  }

  async getOptionById(id: string): Promise<TransportOption | null> {
    const len = this.options.length;
    for (let i = 0; i < len; i++) {
      const o = this.options[i];
      if (o && o.id === id) {
        return o;
      }
    }
    return null;
  }
}

// ─── Mock Alert Repository ────────────────────────────────────────────────────

export class MockAlertRepository implements IAlertRepository {
  private readonly alerts: Alert[] = [
    {
      id: "alert-1",
      venueId: "metlife",
      zoneId: "zone-north-entry",
      category: "crowd",
      severity: "warning",
      title: "High Density – North Entry",
      message:
        "North Entry Plaza is approaching maximum capacity. Security staff have been notified.",
      aiGuidance:
        "Fans in Sections 100-110 should use South Entry. Estimated time saving: 14 minutes.",
      affectedZones: ["zone-north-entry"],
      evacuationRoute: null,
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      acknowledgedBy: [],
      createdBy: "ops-system",
    },
  ];

  async getActiveAlerts(venueId: string): Promise<readonly Alert[]> {
    const res: Alert[] = [];
    const len = this.alerts.length;
    for (let i = 0; i < len; i++) {
      const a = this.alerts[i];
      if (a && a.venueId === venueId && a.isActive) {
        res.push(a);
      }
    }
    return res;
  }

  async createAlert(alertData: Omit<Alert, "id" | "createdAt">): Promise<Alert> {
    const newAlert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      createdAt: new Date(),
    };
    this.alerts.push(newAlert);
    return newAlert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    let alert = null;
    let idx = -1;
    const len = this.alerts.length;
    for (let i = 0; i < len; i++) {
      const a = this.alerts[i];
      if (a && a.id === alertId) {
        alert = a;
        idx = i;
        break;
      }
    }
    if (alert && idx !== -1) {
      // Immutable update pattern
      this.alerts[idx] = {
        ...alert,
        acknowledgedBy: [...alert.acknowledgedBy, userId],
      };
    }
  }
}

// ─── Mock Match Repository ────────────────────────────────────────────────────

export class MockMatchRepository implements IMatchRepository {
  private readonly matches: Match[] = [
    {
      id: "match-gf2026",
      venueId: "metlife",
      homeTeam: "Brazil",
      awayTeam: "France",
      kickoffTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2hrs from now
      stage: "final",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
    },
    {
      id: "match-sofi-1",
      venueId: "sofistadium",
      homeTeam: "Argentina",
      awayTeam: "Germany",
      kickoffTime: new Date(Date.now() - 30 * 60 * 1000), // 30min ago (live)
      stage: "semi-final",
      status: "live",
      homeScore: 1,
      awayScore: 1,
    },
  ];

  async getMatchesByVenue(venueId: string): Promise<readonly Match[]> {
    const res: Match[] = [];
    const len = this.matches.length;
    for (let i = 0; i < len; i++) {
      const m = this.matches[i];
      if (m && m.venueId === venueId) {
        res.push(m);
      }
    }
    return res;
  }

  async getMatchById(id: string): Promise<Match | null> {
    const len = this.matches.length;
    for (let i = 0; i < len; i++) {
      const m = this.matches[i];
      if (m && m.id === id) {
        return m;
      }
    }
    return null;
  }

  async getCurrentMatch(venueId: string): Promise<Match | null> {
    const len = this.matches.length;
    for (let i = 0; i < len; i++) {
      const m = this.matches[i];
      if (m && m.venueId === venueId && (m.status === "live" || m.status === "scheduled")) {
        return m;
      }
    }
    return null;
  }
}
