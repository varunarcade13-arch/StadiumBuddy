"use client";

// ─── Operations Dashboard ──────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import type { VenueCrowdSnapshot } from "@/types/crowd.types";
import type { Alert } from "@/types/alert.types";
import { VENUES } from "@/lib/constants/venues";
import { ROUTES } from "@/lib/constants/routes";

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
  messageSquare: ["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  train: ["M4 15l2-8h12l2 8", "M4 15h16", "M9 15v4m6-4v4", "M9 7h6"],
  map: ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"],
  arrowLeft: ["M19 12H5M12 19l-7-7 7-7"],
  dashboard: ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  check: ["M20 6L9 17l-5-5"],
  info: ["M12 16v-4M12 8h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"],
  arrowUp: ["M12 19V5M5 12l7-7 7 7"],
  arrowDown: ["M12 5v14M5 12l7 7 7-7"],
};

const DENSITY_COLORS: Record<string, string> = {
  low: "var(--density-low)",
  moderate: "var(--density-moderate)",
  high: "var(--density-high)",
  critical: "var(--density-critical)",
};

export default function DashboardPage() {
  const [venueId, setVenueId] = useState("metlife");
  const [crowdData, setCrowdData] = useState<VenueCrowdSnapshot | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [crowdRes, alertsRes] = await Promise.all([
        fetch(`${ROUTES.API.CROWD}?venueId=${venueId}`),
        fetch(`${ROUTES.API.ALERTS}?venueId=${venueId}`),
      ]);

      if (crowdRes.ok) {
        const crowd = await crowdRes.json() as { data: VenueCrowdSnapshot };
        setCrowdData(crowd.data);
      }
      if (alertsRes.ok) {
        const alertData = await alertsRes.json() as { data: Alert[] };
        setAlerts(alertData.data);
      }
    } catch {
      // Silently handle – dashboard shows stale data
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [venueId]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  const criticalZones = crowdData?.zones.filter((z) => z.level === "critical") ?? [];

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-6)", height: "var(--header-height)",
        borderBottom: "1px solid var(--surface-glass-border)",
        background: "var(--surface-header)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: "var(--z-sticky)",
      }}>
        <a href="#main-content" className="skip-nav">Skip to dashboard</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="btn btn-icon btn-sm" aria-label="Back to home">
            <Icon d={ICONS.arrowLeft} size={20} />
          </Link>
          <Logo size={28} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>Operations</span>
          <span className="badge badge-live">LIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="dash-venue" className="sr-only">Select venue</label>
          <select
            id="dash-venue"
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            aria-label="Select venue"
            style={{
              background: "var(--surface-glass)", border: "1px solid var(--surface-glass-border)",
              color: "var(--text-primary)", padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)",
              minHeight: "var(--touch-target-min)",
            }}
          >
            {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={() => void fetchData()} className="btn btn-secondary btn-sm" aria-label="Refresh dashboard data">
            ↻ Refresh
          </button>
          <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">
            AI Assistant
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" style={{ padding: "var(--space-8)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        {/* Last Refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "var(--text-2xl)" }}>
            {VENUES.find((v) => v.id === venueId)?.name ?? "Stadium"} — Command Center
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Last updated: <time dateTime={lastRefresh.toISOString()}>{lastRefresh.toLocaleTimeString()}</time>
          </p>
        </div>

        {/* Key Metrics */}
        <section aria-labelledby="metrics-heading" style={{ marginBottom: "var(--space-8)" }}>
          <h2 id="metrics-heading" className="sr-only">Key Metrics</h2>
          <div className="grid-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 100 }} aria-hidden="true" />
              ))
            ) : (
              <>
                <div className="stat-card">
                  <div className="stat-value">{crowdData?.overallDensity ?? "--"}%</div>
                  <div className="font-semibold">Overall Density</div>
                  <div className="stat-label">{crowdData?.totalCount.toLocaleString() ?? "--"} fans present</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: "var(--density-critical)" }}>{criticalZones.length}</div>
                  <div className="font-semibold">Critical Zones</div>
                  <div className="stat-label">Requires immediate action</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{alerts.length}</div>
                  <div className="font-semibold">Active Alerts</div>
                  <div className="stat-label">Across all zones</div>
                </div>
                <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="font-semibold">Emergency Status</span>
                    <span style={{ color: crowdData?.emergencyActive ? "var(--color-brand-danger)" : "var(--color-brand-accent)", display: "inline-flex" }}>
                      <Icon d={crowdData?.emergencyActive ? ICONS.alertTriangle : ICONS.check} size={24} />
                    </span>
                  </div>
                  <div className="stat-value" style={{ fontSize: "var(--text-2xl)", marginTop: "var(--space-2)" }}>
                    {crowdData?.emergencyActive ? "ACTIVE" : "All Clear"}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Zone Density Grid */}
        <section aria-labelledby="zones-heading" style={{ marginBottom: "var(--space-8)" }}>
          <h2 id="zones-heading" style={{ marginBottom: "var(--space-4)" }}>Zone Density Map</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--space-4)" }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 120 }} aria-hidden="true" />
              ))
              : crowdData?.zones.map((zone) => (
                <div
                  key={zone.zoneId}
                  className="card card-solid"
                  style={{ borderLeft: `4px solid ${DENSITY_COLORS[zone.level] ?? "grey"}` }}
                  aria-label={`${zone.zoneName}: ${zone.level} density at ${zone.density}%`}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                    <h3 style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
                      {zone.zoneName}
                    </h3>
                    <span className={`badge badge-${zone.level}`}>{zone.level.toUpperCase()}</span>
                  </div>
                  <div className="density-bar" role="progressbar" aria-valuenow={zone.density} aria-valuemin={0} aria-valuemax={100} aria-label={`Density: ${zone.density}%`}>
                    <div className="density-bar-fill" data-level={zone.level} style={{ width: `${zone.density}%` }} />
                  </div>
                  <div className="flex items-center justify-between" style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    <span>{zone.estimatedCount.toLocaleString()} / {zone.capacity.toLocaleString()}</span>
                    <span style={{ color: zone.trend === "increasing" ? "var(--density-critical)" : zone.trend === "decreasing" ? "var(--density-low)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 2 }}>
                      {zone.trend === "increasing" ? <Icon d={ICONS.arrowUp} size={14} /> : zone.trend === "decreasing" ? <Icon d={ICONS.arrowDown} size={14} /> : null}
                      {zone.trend === "increasing" ? "Rising" : zone.trend === "decreasing" ? "Falling" : "Stable"}
                    </span>
                  </div>
                  {zone.alertActive && (
                    <div className="alert-banner alert-banner-critical" style={{ marginTop: "var(--space-2)", padding: "var(--space-2) var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon d={ICONS.alertTriangle} size={16} />
                      <span style={{ fontSize: "var(--text-xs)" }}>Alert active – intervention required</span>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </section>

        {/* Active Alerts */}
        <section aria-labelledby="alerts-heading" style={{ marginBottom: "var(--space-8)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
            <h2 id="alerts-heading">Active Alerts</h2>
            <Link href={ROUTES.EMERGENCY} className="btn btn-danger btn-sm">
              Emergency Console →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 56, height: 56, borderRadius: "50%",
                background: "hsla(158, 35%, 46%, 0.14)", border: "1px solid hsla(158, 35%, 46%, 0.22)",
                color: "var(--color-brand-accent)", margin: "0 auto var(--space-3)"
              }}>
                <Icon d={ICONS.check} size={32} />
              </div>
              <p style={{ color: "var(--text-secondary)" }}>No active alerts. All systems normal.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-banner alert-banner-${alert.severity === "emergency" ? "critical" : alert.severity === "warning" ? "warning" : "info"}`}
                  role="alert"
                  aria-label={`${alert.severity} alert: ${alert.title}`}
                  style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}
                >
                  <span style={{ color: alert.severity === "emergency" ? "var(--color-brand-danger)" : alert.severity === "warning" ? "var(--color-brand-warning)" : "var(--color-brand-primary)", display: "inline-flex", marginTop: 2 }}>
                    <Icon d={alert.severity === "info" ? ICONS.info : ICONS.alertTriangle} size={20} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                      <strong>{alert.title}</strong>
                      <span className={`badge badge-${alert.severity === "emergency" ? "critical" : alert.severity === "warning" ? "high" : "info"}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{alert.message}</p>
                    {alert.aiGuidance && (
                      <p style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-1)", opacity: 0.8 }}>
                        <strong>AI Guidance:</strong> {alert.aiGuidance}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" style={{ marginBottom: "var(--space-4)" }}>Quick Actions</h2>
          <div className="grid-4">
            {([
              { href: ROUTES.CHAT, iconKey: "messageSquare" as keyof typeof ICONS, label: "AI Assistant", desc: "Get AI guidance", color: "var(--color-brand-primary)" },
              { href: ROUTES.EMERGENCY, iconKey: "alertTriangle" as keyof typeof ICONS, label: "Emergency", desc: "Manage alerts", color: "var(--color-brand-danger)" },
              { href: ROUTES.TRANSPORT, iconKey: "train" as keyof typeof ICONS, label: "Transport", desc: "Transit status", color: "var(--color-brand-secondary)" },
              { href: ROUTES.NAVIGATE, iconKey: "map" as keyof typeof ICONS, label: "Navigate", desc: "Stadium map", color: "var(--color-brand-accent)" },
            ] as const).map((action) => (
              <Link key={action.href} href={action.href} className="card" style={{ textDecoration: "none", textAlign: "center" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 52, height: 52, borderRadius: "var(--radius-md)",
                  background: `${action.color}18`, border: `1px solid ${action.color}28`,
                  color: action.color, marginBottom: "var(--space-3)",
                }}>
                  <Icon d={ICONS[action.iconKey]} size={26} />
                </div>
                <div style={{ fontWeight: "var(--weight-semibold)" }}>{action.label}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{action.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
