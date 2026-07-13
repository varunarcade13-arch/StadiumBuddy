// ─── Transport Types ───────────────────────────────────────────────────────────

/** Transport mode available near venues */
export type TransportMode = "metro" | "bus" | "shuttle" | "taxi" | "rideshare" | "walking" | "bike";

/** A transport option for a venue */
export interface TransportOption {
  readonly id: string;
  readonly venueId: string;
  readonly mode: TransportMode;
  readonly routeName: string;
  readonly destination: string;
  readonly departurePoint: string;
  readonly estimatedWaitMinutes: number;
  readonly capacity: number;
  readonly currentLoad: number; // 0-100
  readonly nextDepartureAt: Date;
  readonly frequency: string; // e.g. "Every 10 minutes"
  readonly accessible: boolean;
  readonly priceUSD: number | null;
}

/** AI-generated transport recommendation */
export interface TransportRecommendation {
  readonly primaryOption: TransportOption;
  readonly alternativeOptions: readonly TransportOption[];
  readonly reasoning: string;
  readonly estimatedDepartureDelay: number; // minutes after match end
  readonly crowdAwareRoute: boolean;
  readonly accessibilityOptimized: boolean;
}

/** Real-time transport status */
export interface TransportStatus {
  readonly optionId: string;
  readonly currentWaitMinutes: number;
  readonly currentLoad: number;
  readonly serviceActive: boolean;
  readonly disruption: string | null;
  readonly updatedAt: Date;
}
