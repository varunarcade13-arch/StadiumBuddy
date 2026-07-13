"use client";

// ─── Transport Planner Page ────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import type { TransportOption, TransportRecommendation } from "@/types/transport.types";
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
  train: ["M4 15l2-8h12l2 8", "M4 15h16", "M9 15v4m6-4v4", "M9 7h6"],
  bus: ["M4 6h16v10H4zM6 16v3M18 16v3M4 12h16"],
  shuttle: ["M3 8h18v10H3zM6 18v2M18 18v2M7 12h10"],
  car: ["M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"],
  walking: ["M18 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M12 10a2 2 0 100-4 2 2 0 000 4z", "M13 10l-2 4-2-2-3 5"],
  bike: ["M18 17a3 3 0 100-6 3 3 0 000 6z", "M6 17a3 3 0 100-6 3 3 0 000 6z", "M12 9l-4 4h8l-4-4z"],
  arrowLeft: ["M19 12H5M12 19l-7-7 7-7"],
  wheelchair: ["M12 4a2 2 0 100-4 2 2 0 000 4z", "M9 13a4 4 0 004 4h2a4 4 0 004-4v-4h-8v4z"],
  bot: ["M12 8V4H8", "M12 8V4h4", "M3 12a9 9 0 1018 0 9 9 0 00-18 0", "M9 12h.01M15 12h.01"],
  check: ["M20 6L9 17l-5-5"],
  pin: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z", "M12 10a3 3 0 100-6 3 3 0 000 6z"],
  target: ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M12 17a5 5 0 100-10 5 5 0 000 10z", "M12 13a1 1 0 100-2 1 1 0 000 2z"],
  clock: ["M12 6v6l4 2", "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"],
} as const;

const MODE_ICONS: Record<string, keyof typeof ICONS> = {
  metro: "train", bus: "bus", shuttle: "shuttle", taxi: "car",
  rideshare: "car", walking: "walking", bike: "bike",
};

function LoadBar({ percent, accessible }: { percent: number; accessible: boolean }) {
  const level = percent >= 80 ? "critical" : percent >= 60 ? "high" : percent >= 40 ? "moderate" : "low";
  return (
    <div style={{ marginTop: "var(--space-2)" }}>
      <div className="flex items-center justify-between" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-1)" }}>
        <span>Capacity</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          {percent}%{accessible && <Icon d={ICONS.wheelchair} size={12} />}
        </span>
      </div>
      <div className="density-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Capacity utilization: ${percent}%`}>
        <div className="density-bar-fill" data-level={level} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function TransportPage() {
  const [venueId, setVenueId] = useState("metlife");
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [recommendation, setRecommendation] = useState<TransportRecommendation | null>(null);
  const [accessible, setAccessible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTransport = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsRes, recRes] = await Promise.all([
        fetch(`${ROUTES.API.TRANSPORT}?venueId=${venueId}`),
        fetch(`${ROUTES.API.TRANSPORT}?venueId=${venueId}&recommend=true&accessible=${accessible}`),
      ]);
      if (optionsRes.ok) {
        const data = await optionsRes.json() as { data: TransportOption[] };
        setOptions(data.data);
      }
      if (recRes.ok) {
        const data = await recRes.json() as { data: TransportRecommendation };
        setRecommendation(data.data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [venueId, accessible]);

  useEffect(() => { void fetchTransport(); }, [fetchTransport]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-6)", height: "var(--header-height)",
        borderBottom: "1px solid var(--surface-glass-border)",
        background: "var(--surface-header)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: "var(--z-sticky)",
      }}>
        <a href="#main-content" className="skip-nav">Skip to transport planner</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="btn btn-icon btn-sm" aria-label="Back to home">
            <Icon d={ICONS.arrowLeft} size={20} />
          </Link>
          <Logo size={28} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>Transport</span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="transport-venue" className="sr-only">Select venue</label>
          <select id="transport-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)}
            aria-label="Select venue"
            style={{ background: "var(--surface-glass)", border: "1px solid var(--surface-glass-border)", color: "var(--text-primary)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", minHeight: "var(--touch-target-min)" }}>
            {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-sm)", minHeight: "var(--touch-target-min)" }}>
            <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} aria-label="Filter accessible transport only" style={{ width: 18, height: 18 }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon d={ICONS.wheelchair} size={18} /> Accessible only
            </span>
          </label>
          <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">AI Assistant</Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" style={{ padding: "var(--space-8)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "var(--space-8)" }}>Post-Match Transport Planning</h1>

        {/* AI Recommendation */}
        {recommendation && !loading && (
          <section aria-labelledby="rec-heading" style={{ marginBottom: "var(--space-8)" }}>
            <h2 id="rec-heading" style={{ marginBottom: "var(--space-4)", display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Icon d={ICONS.bot} size={26} style={{ color: "var(--color-brand-primary)" }} /> AI Recommendation
            </h2>
            <div className="card" style={{ borderTop: "3px solid var(--color-brand-primary)" }}>
              <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 52, height: 52, borderRadius: "var(--radius-md)",
                  background: "hsla(213, 45%, 58%, 0.12)", border: "1px solid hsla(213, 45%, 58%, 0.18)",
                  color: "var(--color-brand-primary)", flexShrink: 0
                }}>
                  <Icon d={ICONS[MODE_ICONS[recommendation.primaryOption.mode] ?? "bus"]} size={26} />
                </div>
                <div>
                  <h3 style={{ fontSize: "var(--text-xl)" }}>{recommendation.primaryOption.routeName}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                    {recommendation.primaryOption.destination}
                  </p>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: "var(--color-brand-primary)" }}>
                    {recommendation.primaryOption.estimatedWaitMinutes} min
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>estimated wait</div>
                </div>
              </div>

              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                {recommendation.reasoning}
              </p>

              <div className="grid-3" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: "var(--weight-bold)" }}>{recommendation.primaryOption.departurePoint}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Departure Point</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: "var(--weight-bold)" }}>{recommendation.primaryOption.frequency}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Frequency</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: "var(--weight-bold)" }}>
                    {recommendation.primaryOption.priceUSD !== null ? `$${recommendation.primaryOption.priceUSD.toFixed(2)}` : "Varies"}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Price</div>
                </div>
              </div>

              <LoadBar percent={recommendation.primaryOption.currentLoad} accessible={recommendation.primaryOption.accessible} />

              <div className="flex gap-2" style={{ marginTop: "var(--space-4)", flexWrap: "wrap" }}>
                {recommendation.crowdAwareRoute && (
                  <span className="badge badge-info" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon d={ICONS.bot} size={14} /> Crowd-Aware
                  </span>
                )}
                {recommendation.accessibilityOptimized && (
                  <span className="badge badge-low" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon d={ICONS.wheelchair} size={14} /> Accessible
                  </span>
                )}
                {recommendation.primaryOption.accessible && (
                  <span className="badge badge-low" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon d={ICONS.check} size={14} /> Accessible Vehicle
                  </span>
                )}
              </div>

              <Link href={`${ROUTES.CHAT}?q=How+do+I+get+to+${encodeURIComponent(recommendation.primaryOption.departurePoint)}`}
                className="btn btn-primary" style={{ marginTop: "var(--space-4)", width: "100%", justifyContent: "center" }}>
                Get Walking Directions → Departure Point
              </Link>
            </div>
          </section>
        )}

        {/* All Options */}
        <section aria-labelledby="all-options-heading">
          <h2 id="all-options-heading" style={{ marginBottom: "var(--space-4)" }}>All Transport Options</h2>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 200 }} aria-hidden="true" />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
              {options.map((opt) => (
                <div key={opt.id} className="card card-solid" aria-label={`${opt.mode}: ${opt.routeName}`}>
                  <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-3)" }}>
                    <div style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 42, height: 42, borderRadius: "var(--radius-md)",
                      background: "hsla(213, 45%, 58%, 0.12)", border: "1px solid hsla(213, 45%, 58%, 0.18)",
                      color: "var(--color-brand-primary)", flexShrink: 0
                    }}>
                      <Icon d={ICONS[MODE_ICONS[opt.mode] ?? "bus"]} size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: "var(--weight-semibold)" }}>{opt.routeName}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{opt.mode.toUpperCase()}</div>
                    </div>
                    {opt.accessible && (
                      <span className="badge badge-low" style={{ marginLeft: "auto", padding: "4px" }}>
                        <Icon d={ICONS.wheelchair} size={14} />
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={ICONS.pin} size={16} style={{ color: "var(--text-muted)" }} /> {opt.departurePoint}
                  </p>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={ICONS.target} size={16} style={{ color: "var(--text-muted)" }} /> {opt.destination}
                  </p>
                  <div className="grid-2" style={{ marginBottom: "var(--space-3)" }}>
                    <div>
                      <div style={{ fontWeight: "var(--weight-bold)", color: "var(--color-brand-primary)" }}>{opt.estimatedWaitMinutes} min</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Est. wait</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "var(--weight-bold)" }}>{opt.priceUSD !== null ? `$${opt.priceUSD.toFixed(2)}` : "Varies"}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Price</div>
                    </div>
                  </div>
                  <LoadBar percent={opt.currentLoad} accessible={opt.accessible} />
                  <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon d={ICONS.clock} size={14} /> {opt.frequency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
