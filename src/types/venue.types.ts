// ─── Venue Types ───────────────────────────────────────────────────────────────

/** A single zone within a stadium */
export interface StadiumZone {
  readonly id: string;
  readonly name: string;
  readonly level: number; // floor/level
  readonly capacity: number;
  readonly type: "seating" | "concourse" | "entry" | "exit" | "food" | "medical" | "restroom";
  readonly accessibilityFeatures: readonly string[];
  readonly svgPath: string; // SVG path data for map rendering
  readonly centroid: { readonly x: number; readonly y: number };
}

/** A navigational waypoint */
export interface Waypoint {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly connectedTo: readonly string[]; // waypoint IDs
  readonly accessible: boolean;
  readonly level: number;
}

/** FAQ entry for RAG context */
export interface VenueFaq {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: "general" | "accessibility" | "transport" | "food" | "safety" | "tickets";
  readonly language: string;
}

/** Full venue model */
export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly country: "USA" | "Canada" | "Mexico";
  readonly capacity: number;
  readonly address: string;
  readonly timezone: string;
  readonly zones: readonly StadiumZone[];
  readonly waypoints: readonly Waypoint[];
  readonly faqs: readonly VenueFaq[];
  readonly accessibilityFeatures: readonly string[];
  readonly transportOptions: readonly string[];
  readonly sustainabilityFeatures: readonly string[];
  readonly latitude: number;
  readonly longitude: number;
  readonly svgViewBox: string;
}

/** A FIFA World Cup 2026 match */
export interface Match {
  readonly id: string;
  readonly venueId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffTime: Date;
  readonly stage: "group" | "round-of-16" | "quarter-final" | "semi-final" | "final";
  readonly group?: string;
  readonly status: "scheduled" | "live" | "completed";
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}
