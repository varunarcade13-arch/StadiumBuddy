// ─── Alert Types ───────────────────────────────────────────────────────────────

/** Alert severity levels */
export type AlertSeverity = "info" | "warning" | "critical" | "emergency";

/** Alert category */
export type AlertCategory =
  | "crowd"
  | "medical"
  | "security"
  | "fire"
  | "weather"
  | "transport"
  | "general";

/** A site-wide or zone-specific alert */
export interface Alert {
  readonly id: string;
  readonly venueId: string;
  readonly zoneId: string | null; // null = venue-wide
  readonly category: AlertCategory;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly aiGuidance: string; // AI-generated actionable guidance
  readonly affectedZones: readonly string[];
  readonly evacuationRoute: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly acknowledgedBy: readonly string[];
  readonly createdBy: string;
}

/** Emergency protocol with AI-generated instructions */
export interface EmergencyProtocol {
  readonly alertId: string;
  readonly type: "evacuation" | "shelter-in-place" | "medical" | "security";
  readonly instructions: readonly string[];
  readonly accessibleInstructions: readonly string[];
  readonly assemblyPoints: readonly string[];
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly estimatedEvacuationMinutes: number;
}

/** Emergency contact */
export interface EmergencyContact {
  readonly role: string;
  readonly phone: string;
  readonly radio: string | null;
}

/** Create alert request */
export interface CreateAlertRequest {
  readonly venueId: string;
  readonly zoneId: string | null;
  readonly category: AlertCategory;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly affectedZones: readonly string[];
  readonly createdBy: string;
}
