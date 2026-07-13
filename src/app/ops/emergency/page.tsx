"use client";

// ─── Emergency Console ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import type { Alert } from "@/types/alert.types";
import { VENUES } from "@/lib/constants/venues";
import { ROUTES } from "@/lib/constants/routes";

// ─── Inline SVG Icons (Lucide-style, no library needed) ──────────────────────
function Icon({ d, size = 20, stroke = "currentColor", ...props }: {
  d: string | readonly string[]; size?: number; stroke?: string;
  className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      {...props}>
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

const ICONS = {
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  arrowLeft:  ["M19 12H5M12 19l-7-7 7-7"],
  check:      ["M20 6L9 17l-5-5"],
  bot:        ["M12 8V4H8", "M12 8V4h4", "M3 12a9 9 0 1018 0 9 9 0 00-18 0", "M9 12h.01M15 12h.01"],
  info:       ["M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"],
  chevronUp:  ["M18 15l-6-6-6 6"],
  chevronDown: ["M6 9l6 6 6-6"],
  flame:      ["M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3.5z"],
  plusSquare: ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M12 7v10M7 12h10"],
  shield:     ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  users:      ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
} as const;

const SEVERITY_ORDER = { emergency: 0, critical: 1, warning: 2, info: 3 };

const EMERGENCY_PROTOCOLS = [
  { type: "fire", label: "Fire Evacuation", iconKey: "flame" as keyof typeof ICONS, color: "var(--color-brand-danger)", steps: ["Activate fire alarm system", "Direct fans to nearest emergency exits", "Do NOT use elevators", "Assemble at North/South parking areas", "Contact Fire Department: 911", "Coordinate with operations center"] },
  { type: "medical", label: "Medical Emergency", iconKey: "plusSquare" as keyof typeof ICONS, color: "hsl(213, 45%, 58%)", steps: ["Clear 2m radius around patient", "Do NOT move patient unless immediate danger", "Call medical team: Radio Ch. 3", "Request AED if cardiac event", "Direct bystanders away", "Document incident time and location"] },
  { type: "security", label: "Security Threat", iconKey: "shield" as keyof typeof ICONS, color: "var(--color-brand-primary)", steps: ["Do NOT confront suspect", "Contact security command: Radio Ch. 1", "Clear immediate area calmly", "Shelter in place if instructed", "Follow law enforcement instructions", "Do NOT use mobile phones in blast zone"] },
  { type: "crowd", label: "Crowd Surge", iconKey: "users" as keyof typeof ICONS, color: "var(--color-brand-warning)", steps: ["Immediately redirect crowd flow", "Open emergency overflow zones", "Contact crowd management: Radio Ch. 2", "Deploy barrier teams to congested exits", "Pause entry at affected gates", "Coordinate with police on perimeter"] },
] as const;

export default function EmergencyPage() {
  const [venueId, setVenueId] = useState("metlife");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({ title: "", message: "", severity: "warning" as Alert["severity"], category: "general" as Alert["category"] });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ROUTES.API.ALERTS}?venueId=${venueId}`);
      if (res.ok) {
        const data = await res.json() as { data: Alert[] };
        const sorted = [...data.data].sort((a, b) =>
          (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
        );
        setAlerts(sorted);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [venueId]);

  useEffect(() => { void fetchAlerts(); const i = setInterval(() => void fetchAlerts(), 15000); return () => clearInterval(i); }, [fetchAlerts]);

  const handleCreateAlert = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API.ALERTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAlertForm, venueId, zoneId: null, affectedZones: [], createdBy: "ops-staff" }),
      });
      if (res.ok) { setCreatingAlert(false); void fetchAlerts(); }
    } catch { /* silent */ }
  }, [newAlertForm, venueId, fetchAlerts]);

  const emergencyAlerts = alerts.filter((a) => a.severity === "emergency");
  const hasEmergency = emergencyAlerts.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: hasEmergency ? "linear-gradient(135deg, hsl(220,20%,7%) 0%, hsl(4,30%,10%) 100%)" : "var(--gradient-hero)" }}>
      {/* Emergency Banner */}
      {hasEmergency && (
        <div role="alert" aria-live="assertive" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", background: "var(--gradient-danger)", padding: "var(--space-4) var(--space-8)", textAlign: "center", fontWeight: "var(--weight-bold)", animation: "pulse 2s infinite" }}>
          <Icon d={ICONS.alertTriangle} size={22} /> EMERGENCY ACTIVE — {emergencyAlerts[0]?.title ?? "ALERT"} — FOLLOW PROTOCOLS
        </div>
      )}

      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-6)", height: "var(--header-height)",
        borderBottom: "1px solid var(--surface-glass-border)",
        background: "var(--surface-header)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: "var(--z-sticky)",
      }}>
        <a href="#main-content" className="skip-nav">Skip to emergency console</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.DASHBOARD} className="btn btn-icon btn-sm" aria-label="Back to dashboard">
            <Icon d={ICONS.arrowLeft} size={20} />
          </Link>
          <Logo size={28} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>Emergency</span>
          {hasEmergency && <span className="badge badge-critical">EMERGENCY ACTIVE</span>}
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="emg-venue" className="sr-only">Select venue</label>
          <select id="emg-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)}
            style={{ background: "var(--surface-glass)", border: "1px solid var(--surface-glass-border)", color: "var(--text-primary)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", minHeight: "var(--touch-target-min)" }}>
            {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={() => setCreatingAlert(true)} className="btn btn-danger btn-sm" aria-label="Create new emergency alert">
            + New Alert
          </button>
          <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">AI Guidance</Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" style={{ padding: "var(--space-8)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "var(--space-8)", alignItems: "start" }}>

          {/* Left: Alerts */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-6)" }}>
              <h1>Active Alerts</h1>
              <button onClick={() => void fetchAlerts()} className="btn btn-secondary btn-sm">↻ Refresh</button>
            </div>

            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 120, marginBottom: "var(--space-3)" }} aria-hidden="true" />)
            ) : alerts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "var(--space-10)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 80, height: 80, borderRadius: "50%",
                  background: "hsla(158, 35%, 46%, 0.14)", border: "1px solid hsla(158, 35%, 46%, 0.22)",
                  color: "var(--color-brand-accent)", margin: "0 auto var(--space-4)" }}>
                  <Icon d={ICONS.check} size={40} />
                </div>
                <h2>All Clear</h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>No active alerts. All systems operating normally.</p>
              </div>
            ) : (
              <div role="list" aria-label="Active emergency alerts" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    role="listitem"
                    className="card card-solid"
                    style={{ borderLeft: `4px solid ${alert.severity === "emergency" ? "var(--color-brand-danger)" : alert.severity === "critical" ? "var(--density-high)" : alert.severity === "warning" ? "var(--color-brand-warning)" : "var(--color-brand-primary)"}` }}
                    aria-label={`${alert.severity} alert: ${alert.title}`}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: alert.severity === "emergency" ? "var(--color-brand-danger)" : alert.severity === "critical" ? "var(--color-brand-warning)" : "var(--color-brand-primary)", display: "inline-flex" }}>
                          <Icon d={alert.severity === "info" ? ICONS.info : ICONS.alertTriangle} size={22} />
                        </span>
                        <h3 style={{ fontSize: "var(--text-base)" }}>{alert.title}</h3>
                      </div>
                      <span className={`badge badge-${alert.severity === "emergency" ? "critical" : alert.severity === "warning" ? "high" : "info"}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>{alert.message}</p>
                    {alert.aiGuidance && (
                      <div style={{ background: "hsla(213,45%,58%,0.08)", border: "1px solid hsla(213,45%,58%,0.2)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--color-brand-primary)", marginBottom: "var(--space-1)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon d={ICONS.bot} size={12} /> AI GUIDANCE
                        </div>
                        <p style={{ fontSize: "var(--text-sm)" }}>{alert.aiGuidance}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      <time dateTime={alert.createdAt instanceof Date ? alert.createdAt.toISOString() : String(alert.createdAt)}>
                        Created: {alert.createdAt instanceof Date ? alert.createdAt.toLocaleTimeString() : "Recently"}
                      </time>
                      <span>Category: {alert.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Protocols */}
          <div>
            <h2 style={{ marginBottom: "var(--space-4)" }}>Emergency Protocols</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {EMERGENCY_PROTOCOLS.map((protocol) => (
                <div key={protocol.type}>
                  <button
                    onClick={() => setSelectedProtocol(selectedProtocol === protocol.type ? null : protocol.type)}
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "space-between", borderLeft: `4px solid ${protocol.color}` }}
                    aria-expanded={selectedProtocol === protocol.type}
                    aria-controls={`protocol-${protocol.type}`}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: protocol.color, display: "inline-flex" }}><Icon d={ICONS[protocol.iconKey]} size={20} /></span>
                      {protocol.label}
                    </span>
                    <span style={{ display: "inline-flex" }}>
                      <Icon d={selectedProtocol === protocol.type ? ICONS.chevronUp : ICONS.chevronDown} size={20} />
                    </span>
                  </button>
                  {selectedProtocol === protocol.type && (
                    <div
                      id={`protocol-${protocol.type}`}
                      role="region"
                      aria-label={`${protocol.label} protocol steps`}
                      className="card card-solid animate-fade-in"
                      style={{ marginTop: "var(--space-2)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}
                    >
                      <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {protocol.steps.map((step, i) => (
                          <li key={i} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                            <span style={{ background: protocol.color, color: "white", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-relaxed)" }}>{step}</span>
                          </li>
                        ))}
                      </ol>
                      <Link href={`${ROUTES.CHAT}?q=${encodeURIComponent(`Emergency ${protocol.type} protocol - what should I do?`)}`}
                        className="btn btn-primary btn-sm" style={{ marginTop: "var(--space-4)", width: "100%", justifyContent: "center" }}>
                        Get AI Guidance for This Emergency
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Emergency Contacts */}
            <div className="card card-solid" style={{ marginTop: "var(--space-6)" }}>
              <h3 style={{ marginBottom: "var(--space-3)" }}>Emergency Contacts</h3>
              {[
                { role: "Emergency Services", phone: "911" },
                { role: "Stadium Security Command", phone: "Radio Ch. 1" },
                { role: "Medical Team", phone: "Radio Ch. 3" },
                { role: "Operations Center", phone: "Radio Ch. 5" },
                { role: "Fire Marshal", phone: "Radio Ch. 7" },
              ].map((contact) => (
                <div key={contact.role} className="flex items-center justify-between" style={{ padding: "var(--space-2) 0", borderBottom: "1px solid var(--surface-glass-border)", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>{contact.role}</span>
                  <strong style={{ color: "var(--color-brand-primary)" }}>{contact.phone}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Create Alert Modal */}
      {creatingAlert && (
        <div role="dialog" aria-modal="true" aria-labelledby="create-alert-title" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "var(--z-modal)", padding: "var(--space-6)" }}>
          <div className="card card-solid" style={{ width: "100%", maxWidth: 480, animation: "fadeInUp 300ms ease-out" }}>
            <h2 id="create-alert-title" style={{ marginBottom: "var(--space-6)" }}>Create New Alert</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label htmlFor="alert-title" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>Alert Title *</label>
                <input id="alert-title" className="input" value={newAlertForm.title} onChange={(e) => setNewAlertForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief description of the situation" maxLength={100} required />
              </div>
              <div>
                <label htmlFor="alert-message" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>Details *</label>
                <textarea id="alert-message" className="input" value={newAlertForm.message} onChange={(e) => setNewAlertForm((f) => ({ ...f, message: e.target.value }))} placeholder="Detailed description of the situation" rows={3} maxLength={500} required />
              </div>
              <div className="grid-2">
                <div>
                  <label htmlFor="alert-severity" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>Severity *</label>
                  <select id="alert-severity" className="input" value={newAlertForm.severity} onChange={(e) => setNewAlertForm((f) => ({ ...f, severity: e.target.value as Alert["severity"] }))}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="alert-category" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>Category *</label>
                  <select id="alert-category" className="input" value={newAlertForm.category} onChange={(e) => setNewAlertForm((f) => ({ ...f, category: e.target.value as Alert["category"] }))}>
                    <option value="general">General</option>
                    <option value="crowd">Crowd</option>
                    <option value="medical">Medical</option>
                    <option value="security">Security</option>
                    <option value="fire">Fire</option>
                    <option value="weather">Weather</option>
                    <option value="transport">Transport</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3" style={{ marginTop: "var(--space-6)" }}>
              <button onClick={() => setCreatingAlert(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => void handleCreateAlert()} disabled={!newAlertForm.title || !newAlertForm.message} className="btn btn-danger" style={{ flex: 1 }}>
                Broadcast Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
