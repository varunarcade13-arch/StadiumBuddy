// ─── Crowd Types ───────────────────────────────────────────────────────────────

/** Crowd density level for a zone */
export type DensityLevel = "low" | "moderate" | "high" | "critical";

/** Stadium zone identifier */
export type ZoneId = string;

/** Real-time crowd data for a single zone */
export interface ZoneDensity {
  readonly zoneId: ZoneId;
  readonly zoneName: string;
  readonly density: number; // 0-100 percentage
  readonly level: DensityLevel;
  readonly estimatedCount: number;
  readonly capacity: number;
  readonly trend: "increasing" | "stable" | "decreasing";
  readonly updatedAt: Date;
  readonly alertActive: boolean;
}

/** Crowd snapshot for an entire venue */
export interface VenueCrowdSnapshot {
  readonly venueId: string;
  readonly venueName: string;
  readonly overallDensity: number;
  readonly totalCount: number;
  readonly totalCapacity: number;
  readonly zones: readonly ZoneDensity[];
  readonly timestamp: Date;
  readonly emergencyActive: boolean;
}

/** Crowd alert triggered when density exceeds threshold */
export interface CrowdAlert {
  readonly alertId: string;
  readonly zoneId: ZoneId;
  readonly zoneName: string;
  readonly severity: "warning" | "critical" | "emergency";
  readonly message: string;
  readonly aiRecommendation: string;
  readonly triggeredAt: Date;
  readonly resolvedAt: Date | null;
  readonly acknowledgedBy: string | null;
}
