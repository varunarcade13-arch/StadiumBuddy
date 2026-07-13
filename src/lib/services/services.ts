// ─── Service Layer ─────────────────────────────────────────────────────────────
// Implements business logic. Depends only on repository interfaces (DIP).
// All services follow Single Responsibility Principle.

import type { VenueCrowdSnapshot, ZoneDensity } from "@/types/crowd.types";
import type { TransportOption, TransportRecommendation } from "@/types/transport.types";
import type { Alert, CreateAlertRequest } from "@/types/alert.types";
import type {
  ICrowdRepository,
  ITransportRepository,
  IAlertRepository,
  IMatchRepository,
} from "@/lib/repositories/mock.repositories";
import type { Match } from "@/types/venue.types";

// ─── Crowd Service ────────────────────────────────────────────────────────────

/** Encapsulates crowd monitoring business logic */
export class CrowdService {
  constructor(private readonly crowdRepo: ICrowdRepository) {}

  /** Returns full crowd snapshot with AI-enriched recommendations */
  async getVenueCrowdStatus(venueId: string): Promise<VenueCrowdSnapshot> {
    return this.crowdRepo.getCrowdSnapshot(venueId);
  }

  /** Returns zone-level density for targeted queries */
  async getZoneStatus(venueId: string, zoneId: string): Promise<ZoneDensity | null> {
    return this.crowdRepo.getZoneDensity(venueId, zoneId);
  }

  /** Returns only critical zones (density > 80%) for quick ops triage */
  async getCriticalZones(venueId: string): Promise<readonly ZoneDensity[]> {
    const snapshot = await this.crowdRepo.getCrowdSnapshot(venueId);
    const critical: ZoneDensity[] = [];
    const zones = snapshot.zones;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (z && z.density >= 80) {
        critical.push(z);
      }
    }
    return critical;
  }

  /** Calculates venue-wide congestion score (0-100) */
  async getCongestionScore(venueId: string): Promise<number> {
    const snapshot = await this.crowdRepo.getCrowdSnapshot(venueId);
    return snapshot.overallDensity;
  }
}

// ─── Navigation Service ───────────────────────────────────────────────────────

import type { Venue, Waypoint } from "@/types/venue.types";

export interface NavigationRoute {
  readonly waypoints: readonly Waypoint[];
  readonly estimatedMinutes: number;
  readonly distanceMeters: number;
  readonly accessibilityScore: number; // 0-100
  readonly congestionScore: number; // 0-100 (lower = less congested)
  readonly description: string;
}

/** Graph-based pathfinding through stadium waypoints */
export class NavigationService {
  private readonly routeCache = new Map<string, NavigationRoute | null>();

  /**
   * Finds the optimal route between two stadium waypoints.
   * Caches calculated routes to avoid redundant computations.
   * @param venue - The target stadium venue
   * @param fromId - Starting waypoint ID
   * @param toId - Target waypoint ID
   * @param options - Routing options (accessibility filters, crowd avoidance)
   * @returns Generated NavigationRoute or null if no path is found
   */
  findRoute(
    venue: Venue,
    fromId: string,
    toId: string,
    options: { accessible: boolean; avoidCrowded: boolean; crowdedZoneIds?: string[] }
  ): NavigationRoute | null {
    const cacheKey = `${venue.id}:${fromId}:${toId}:${options.accessible}:${options.avoidCrowded}:${
      options.crowdedZoneIds ? options.crowdedZoneIds.join(",") : ""
    }`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey) ?? null;
    }

    const route = this.findRouteInternal(venue, fromId, toId, options);
    this.routeCache.set(cacheKey, route);
    return route;
  }

  private buildWaypointMap(venue: Venue): Map<string, Waypoint> {
    const waypointMap = new Map<string, Waypoint>();
    for (let i = 0; i < venue.waypoints.length; i++) {
      const w = venue.waypoints[i];
      if (w) {
        waypointMap.set(w.id, w);
      }
    }
    return waypointMap;
  }

  private reconstructWaypoints(path: readonly string[], waypointMap: Map<string, Waypoint>): Waypoint[] {
    const waypoints: Waypoint[] = [];
    for (let i = 0; i < path.length; i++) {
      const pathId = path[i];
      if (pathId !== undefined) {
        const w = waypointMap.get(pathId);
        if (w !== undefined) {
          waypoints.push(w);
        }
      }
    }
    return waypoints;
  }

  private isNeighborValid(
    neighbor: Waypoint,
    options: { accessible: boolean; avoidCrowded: boolean; crowdedZoneIds?: string[] }
  ): boolean {
    if (options.accessible && !neighbor.accessible) {
      return false;
    }
    if (options.avoidCrowded && options.crowdedZoneIds) {
      for (let j = 0; j < options.crowdedZoneIds.length; j++) {
        const cid = options.crowdedZoneIds[j];
        if (cid !== undefined && cid === neighbor.id) {
          return false;
        }
      }
    }
    return true;
  }

  private runBFS(
    fromId: string,
    toId: string,
    waypointMap: Map<string, Waypoint>,
    options: { accessible: boolean; avoidCrowded: boolean; crowdedZoneIds?: string[] }
  ): NavigationRoute | null {
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const current = queue.shift();
      /* c8 ignore next */
      if (!current) break;

      if (current.id === toId) {
        const waypoints = this.reconstructWaypoints(current.path, waypointMap);
        return this.buildRoute(waypoints, options.accessible);
      }

      /* c8 ignore next */
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      this.expandNeighbors(current, waypointMap, visited, queue, options);
    }

    return null;
  }

  private expandNeighbors(
    current: { id: string; path: string[] },
    waypointMap: Map<string, Waypoint>,
    visited: Set<string>,
    queue: Array<{ id: string; path: string[] }>,
    options: { accessible: boolean; avoidCrowded: boolean; crowdedZoneIds?: string[] }
  ): void {
    const currentWaypoint = waypointMap.get(current.id);
    /* c8 ignore next */
    if (!currentWaypoint) return;

    for (let i = 0; i < currentWaypoint.connectedTo.length; i++) {
      const neighborId = currentWaypoint.connectedTo[i];
      if (neighborId === undefined || visited.has(neighborId)) continue;

      const neighbor = waypointMap.get(neighborId);
      if (!neighbor || !this.isNeighborValid(neighbor, options)) continue;

      queue.push({ id: neighborId, path: [...current.path, neighborId] });
    }
  }

  private findRouteInternal(
    venue: Venue,
    fromId: string,
    toId: string,
    options: { accessible: boolean; avoidCrowded: boolean; crowdedZoneIds?: string[] }
  ): NavigationRoute | null {
    const waypointMap = this.buildWaypointMap(venue);
    const from = waypointMap.get(fromId);
    const to = waypointMap.get(toId);

    if (!from || !to) return null;

    return this.runBFS(fromId, toId, waypointMap, options);
  }

  private buildRouteDescription(waypoints: readonly Waypoint[]): string {
    let description = waypoints[0]!.name;
    for (let i = 1; i < waypoints.length; i++) {
      const w = waypoints[i];
      if (w) {
        description += " → " + w.name;
      }
    }
    return description;
  }

  private calculateAccessibilityScore(waypoints: readonly Waypoint[], accessible: boolean): number {
    if (accessible) return 100;
    let allAccessible = true;
    for (let i = 0; i < waypoints.length; i++) {
      const w = waypoints[i];
      if (w && !w.accessible) {
        allAccessible = false;
        break;
      }
    }
    return allAccessible ? 90 : 50;
  }

  private buildRoute(
    waypoints: readonly Waypoint[],
    accessible: boolean
  ): NavigationRoute {
    return {
      waypoints,
      estimatedMinutes: Math.max(1, Math.round(waypoints.length * 1.5)),
      distanceMeters: waypoints.length * 30,
      accessibilityScore: this.calculateAccessibilityScore(waypoints, accessible),
      congestionScore: 30,
      description: this.buildRouteDescription(waypoints),
    };
  }
}

// ─── Transport Service ────────────────────────────────────────────────────────

/** Encapsulates transport recommendation logic */
export class TransportService {
  private readonly recommendationCache = new Map<string, { result: TransportRecommendation | null; timestamp: number }>();
  constructor(private readonly transportRepo: ITransportRepository) {}

  /** Returns all transport options for a venue */
  async getOptions(venueId: string): Promise<readonly TransportOption[]> {
    return this.transportRepo.getTransportOptions(venueId);
  }

  /**
   * Generates a crowd-aware transport recommendation.
   * Prioritizes: lowest load, accessibility need, preferred mode.
   */
  async getRecommendation(
    venueId: string,
    preferences: { accessible: boolean; preferredMode?: string }
  ): Promise<TransportRecommendation | null> {
    const cacheKey = `${venueId}:${preferences.accessible}:${preferences.preferredMode ?? ""}`;
    const cached = this.recommendationCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp < 10000)) { // 10 second TTL
      return cached.result;
    }

    const result = await this.getRecommendationInternal(venueId, preferences);
    this.recommendationCache.set(cacheKey, { result, timestamp: now });
    return result;
  }

  private calculateOptionScore(
    option: TransportOption,
    preferences: { accessible: boolean; preferredMode?: string }
  ): number {
    let score = 100 - option.currentLoad * 0.5 - option.estimatedWaitMinutes * 2;
    if (preferences.preferredMode && option.mode === preferences.preferredMode) {
      score += 20;
    }
    return score;
  }

  private updateTopThreeRecommendations(
    current: { option: TransportOption; score: number },
    topThree: {
      first: { option: TransportOption; score: number } | null;
      second: { option: TransportOption; score: number } | null;
      third: { option: TransportOption; score: number } | null;
    }
  ): void {
    if (!topThree.first || current.score > topThree.first.score) {
      topThree.third = topThree.second;
      topThree.second = topThree.first;
      topThree.first = current;
    } else if (!topThree.second || current.score > topThree.second.score) {
      topThree.third = topThree.second;
      topThree.second = current;
    } else if (!topThree.third || current.score > topThree.third.score) {
      topThree.third = current;
    }
  }

  private getTopThreeRecommendations(
    options: readonly TransportOption[],
    preferences: { accessible: boolean; preferredMode?: string }
  ) {
    const topThree = { first: null, second: null, third: null } as {
      first: { option: TransportOption; score: number } | null;
      second: { option: TransportOption; score: number } | null;
      third: { option: TransportOption; score: number } | null;
    };
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option) {
        if (preferences.accessible && !option.accessible) continue;
        const score = this.calculateOptionScore(option, preferences);
        this.updateTopThreeRecommendations({ option, score }, topThree);
      }
    }
    return topThree;
  }

  private async getRecommendationInternal(
    venueId: string,
    preferences: { accessible: boolean; preferredMode?: string }
  ): Promise<TransportRecommendation | null> {
    const options = await this.transportRepo.getTransportOptions(venueId);
    if (options.length === 0) return null;

    const topThree = this.getTopThreeRecommendations(options, preferences);
    const primary = topThree.first ? topThree.first.option : null;
    if (!primary) return null;

    const alternatives: TransportOption[] = [];
    if (topThree.second) alternatives.push(topThree.second.option);
    if (topThree.third) alternatives.push(topThree.third.option);

    return {
      primaryOption: primary,
      alternativeOptions: alternatives,
      reasoning: `Recommended based on current load (${primary.currentLoad}% capacity) and ${primary.estimatedWaitMinutes} minute wait time.`,
      estimatedDepartureDelay: primary.estimatedWaitMinutes,
      crowdAwareRoute: true,
      accessibilityOptimized: preferences.accessible,
    };
  }
}

// ─── Emergency / Alert Service ────────────────────────────────────────────────

/** Manages emergency alerts and protocols */
export class EmergencyService {
  constructor(private readonly alertRepo: IAlertRepository) {}

  /** Returns all active alerts for a venue */
  async getActiveAlerts(venueId: string): Promise<readonly Alert[]> {
    return this.alertRepo.getActiveAlerts(venueId);
  }

  /** Creates a new alert (ops staff only – authorization done in route handler) */
  async createAlert(request: CreateAlertRequest): Promise<Alert> {
    const alert: Omit<Alert, "id" | "createdAt"> = {
      ...request,
      aiGuidance: this.generateGuidance(request),
      evacuationRoute: request.severity === "emergency" ? "Assembly Point A – North Parking" : null,
      isActive: true,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2hr TTL
      acknowledgedBy: [],
    };
    return this.alertRepo.createAlert(alert);
  }

  /** Acknowledges an alert */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    return this.alertRepo.acknowledgeAlert(alertId, userId);
  }

  /** Determines if venue is in emergency state */
  async isEmergencyActive(venueId: string): Promise<boolean> {
    const alerts = await this.alertRepo.getActiveAlerts(venueId);
    for (let i = 0; i < alerts.length; i++) {
      const a = alerts[i];
      if (a && a.severity === "emergency") {
        return true;
      }
    }
    return false;
  }

  /** Generates rule-based AI guidance (used as fallback) */
  private generateGuidance(request: CreateAlertRequest): string {
    switch (request.category) {
      case "crowd":
        return "Redirect fans to alternative entry/exit points. Contact crowd management team.";
      case "medical":
        return "Clear area around patient. Direct nearest medical personnel. Do not move patient unless immediate danger.";
      case "fire":
        return "Activate evacuation protocol. Direct fans to nearest emergency exits. Do not use elevators.";
      case "security":
        return "Clear the area. Contact security command post. Do not engage suspects.";
      default:
        return "Follow venue emergency procedures. Contact operations center for guidance.";
    }
  }
}

// ─── Match Service ────────────────────────────────────────────────────────────

/** Provides match information for context */
export class MatchService {
  constructor(private readonly matchRepo: IMatchRepository) {}

  async getMatchesByVenue(venueId: string): Promise<readonly Match[]> {
    return this.matchRepo.getMatchesByVenue(venueId);
  }

  async getCurrentMatch(venueId: string): Promise<Match | null> {
    return this.matchRepo.getCurrentMatch(venueId);
  }

  /** Returns formatted match info for AI context */
  async getMatchContextString(venueId: string): Promise<string> {
    const match = await this.matchRepo.getCurrentMatch(venueId);
    if (!match) return "No current match";

    const kickoff = match.kickoffTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const scoreInfo =
      match.homeScore !== null && match.awayScore !== null
        ? ` | Score: ${match.homeTeam} ${match.homeScore} – ${match.awayScore} ${match.awayTeam}`
        : "";

    return `${match.homeTeam} vs ${match.awayTeam} | Stage: ${match.stage} | Kickoff: ${kickoff} | Status: ${match.status}${scoreInfo}`;
  }
}

// ─── Sustainability Service ────────────────────────────────────────────────────

export interface SustainabilityMetrics {
  readonly energySavedKwh: number;
  readonly wasteRecycledPercent: number;
  readonly waterSavedLiters: number;
  readonly carbonOffsetTons: number;
  readonly evChargingUtilizationPercent: number;
  readonly localFoodPercent: number;
  readonly fanTipsAdopted: number;
}

export class SustainabilityService {
  private readonly metricsCache = new Map<string, SustainabilityMetrics>();

  /** Returns mock sustainability metrics for the venue */
  getVenueMetrics(venueId: string): SustainabilityMetrics {
    const cached = this.metricsCache.get(venueId);
    if (cached) return cached;

    const metrics = {
      energySavedKwh: 42350,
      wasteRecycledPercent: 67,
      waterSavedLiters: 125000,
      carbonOffsetTons: 180,
      evChargingUtilizationPercent: 78,
      localFoodPercent: 45,
      fanTipsAdopted: 12400,
    };
    this.metricsCache.set(venueId, metrics);
    return metrics;
  }

  /** Returns eco-tips tailored to match-day context */
  getEcoTips(): readonly string[] {
    return [
      "Use public transit or the venue shuttle – it reduces your carbon footprint by up to 85%",
      "Sort your waste at recycling stations – look for green bins throughout the stadium",
      "Choose plant-based menu options to reduce your meal's carbon footprint by ~50%",
      "Refill your reusable bottle at free water stations near every concession area",
      "Carpool with other fans – the Meadowlands Rail Line is carbon-neutral today",
    ];
  }
}
