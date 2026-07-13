"use client";

// ─── Stadium Navigation Page ───────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import { VENUES } from "@/lib/constants/venues";
import { NavigationService, type NavigationRoute } from "@/lib/services/services";
import { ROUTES } from "@/lib/constants/routes";
import type { Venue } from "@/types/venue.types";

import { Icon, type IconKey } from "@/app/components/Icon";


const navService = new NavigationService();

function StadiumMapSVG({ venue, route }: { venue: Venue; route: NavigationRoute | null }) {
  const routeWaypointIds = new Set(route?.waypoints.map((w) => w.id) ?? []);

  return (
    <svg
      viewBox={venue.svgViewBox}
      role="img"
      aria-label={`Stadium map of ${venue.name}`}
      style={{ width: "100%", height: "100%", background: "var(--surface-bg)", borderRadius: "var(--radius-lg)" }}
    >
      <title>{`${venue.name} Stadium Map`}</title>
      {/* Zones */}
      {venue.zones.map((zone) => (
        <g key={zone.id}>
          <path
            d={zone.svgPath}
            fill={zone.type === "seating" ? "hsla(220,40%,30%,0.5)" :
              zone.type === "entry" || zone.type === "exit" ? "hsla(158,60%,30%,0.5)" :
                zone.type === "food" ? "hsla(38,80%,30%,0.5)" :
                  zone.type === "medical" ? "hsla(4,70%,30%,0.5)" : "hsla(220,20%,25%,0.5)"}
            stroke="var(--surface-glass-border)"
            strokeWidth={1}
            aria-label={zone.name}
          />
          <text
            x={zone.centroid.x}
            y={zone.centroid.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize={10}
            fontFamily="var(--font-sans)"
          >
            {zone.name.length > 12 ? zone.name.slice(0, 12) + "…" : zone.name}
          </text>
        </g>
      ))}

      {/* Waypoints */}
      {venue.waypoints.map((wp) => {
        const isOnRoute = routeWaypointIds.has(wp.id);
        return (
          <g key={wp.id}>
            <circle
              cx={wp.x}
              cy={wp.y}
              r={isOnRoute ? 8 : 5}
              fill={isOnRoute ? "var(--color-brand-primary)" : "hsla(220,40%,50%,0.6)"}
              stroke={isOnRoute ? "white" : "transparent"}
              strokeWidth={isOnRoute ? 2 : 0}
              aria-label={wp.name + (isOnRoute ? " (on route)" : "")}
            />
            {isOnRoute && (
              <text x={wp.x + 10} y={wp.y + 4} fill="var(--color-brand-primary)" fontSize={9} fontFamily="var(--font-sans)">
                {wp.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Route Path */}
      {route && route.waypoints.length > 1 && (
        <polyline
          points={route.waypoints.map((w) => `${w.x},${w.y}`).join(" ")}
          fill="none"
          stroke="var(--color-brand-primary)"
          strokeWidth={3}
          strokeDasharray="8 4"
          aria-label="Suggested route"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        />
      )}

      {/* Legend */}
      <g transform="translate(10, 10)">
        {[
          { color: "hsla(220,40%,30%,0.7)", label: "Seating" },
          { color: "hsla(158,60%,30%,0.7)", label: "Entry/Exit" },
          { color: "hsla(38,80%,30%,0.7)", label: "Food" },
          { color: "hsla(4,70%,30%,0.7)", label: "Medical" },
        ].map((item, i) => (
          <g key={item.label} transform={`translate(0, ${i * 18})`}>
            <rect width={12} height={12} fill={item.color} rx={2} />
            <text x={16} y={10} fill="var(--text-muted)" fontSize={9} fontFamily="var(--font-sans)">{item.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function NavigatePage() {
  const [venueId, setVenueId] = useState("metlife");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [accessible, setAccessible] = useState(false);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [noRoute, setNoRoute] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const venue = VENUES.find((v) => v.id === venueId);

  // ── All hooks must be called before any conditional returns ─────────────────
  const findRoute = useCallback(() => {
    if (!venue || !fromId || !toId) return;
    setNoRoute(false);
    Promise.resolve().then(() => {
      const found = navService.findRoute(venue, fromId, toId, { accessible, avoidCrowded: true });
      if (found) { setRoute(found); }
      else { setRoute(null); setNoRoute(true); }
    });
  }, [venue, fromId, toId, accessible]);

  // Guard: render nothing until client hydration is complete
  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }} />;
  }

  if (!venue) return null;


  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-6)", height: "var(--header-height)",
        borderBottom: "1px solid var(--surface-glass-border)",
        background: "var(--surface-header)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: "var(--z-sticky)",
      }}>
        <a href="#main-content" className="skip-nav">Skip to navigation</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="btn btn-icon btn-sm" aria-label="Back">
            <Icon name="arrowLeft" size={20} />
          </Link>
          <Logo size={28} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>Navigation</span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="nav-venue" className="sr-only">Select venue</label>
          <select id="nav-venue" value={venueId} onChange={(e) => { setVenueId(e.target.value); setRoute(null); setFromId(""); setToId(""); }}
            style={{ background: "var(--surface-glass)", border: "1px solid var(--surface-glass-border)", color: "var(--text-primary)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-sm)", minHeight: "var(--touch-target-min)" }}>
            {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">AI Assistant</Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "var(--space-6)", padding: "var(--space-6)", height: "calc(100vh - var(--header-height))" }}>
        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", overflowY: "auto" }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>Find Your Route</h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            AI-powered routing that avoids crowded areas and finds accessible paths.
          </p>

          <div>
            <label htmlFor="from-wp" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
              Starting Point
            </label>
            <select id="from-wp" className="input" value={fromId} onChange={(e) => setFromId(e.target.value)} aria-label="Select starting waypoint">
              <option value="">Select starting point...</option>
              {venue.waypoints.map((wp) => (
                <option key={wp.id} value={wp.id}>{wp.name}{!wp.accessible ? " (Limited Access)" : ""}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="to-wp" style={{ display: "block", marginBottom: "var(--space-1)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>
              Destination
            </label>
            <select id="to-wp" className="input" value={toId} onChange={(e) => setToId(e.target.value)} aria-label="Select destination waypoint">
              <option value="">Select destination...</option>
              {venue.waypoints.map((wp) => (
                <option key={wp.id} value={wp.id}>{wp.name}{!wp.accessible ? " (Limited Access)" : ""}</option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer", minHeight: "var(--touch-target-min)" }}>
            <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} style={{ width: 18, height: 18 }} aria-label="Find accessible route only" />
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="wheelchair" size={18} /> Accessible route only
            </span>
          </label>

          <button onClick={findRoute} disabled={!fromId || !toId} className="btn btn-primary" aria-label="Find route" style={{ gap: "var(--space-2)" }}>
            <Icon name="map" size={20} /> Find Route
          </button>

          {noRoute && (
            <div className="alert-banner alert-banner-warning" role="alert">
              <Icon name="alertTriangle" size={20} />
              No route found between selected points. Try disabling accessibility filter or choosing different points.
            </div>
          )}

          {route && (
            <div className="card card-solid animate-fade-in">
              <h2 style={{ fontSize: "var(--text-base)", marginBottom: "var(--space-3)" }}>Route Details</h2>
              <div className="grid-2" style={{ marginBottom: "var(--space-3)" }}>
                <div className="stat-card" style={{ padding: "var(--space-3)" }}>
                  <div className="stat-value" style={{ fontSize: "var(--text-2xl)" }}>{route.estimatedMinutes}</div>
                  <div className="stat-label">minutes</div>
                </div>
                <div className="stat-card" style={{ padding: "var(--space-3)" }}>
                  <div className="stat-value" style={{ fontSize: "var(--text-2xl)" }}>{route.distanceMeters}m</div>
                  <div className="stat-label">distance</div>
                </div>
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                <strong>Path:</strong> {route.description}
              </div>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {route.accessibilityScore >= 90 && (
                  <span className="badge badge-low" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon name="wheelchair" size={14} /> Fully Accessible
                  </span>
                )}
                {route.congestionScore < 50 && (
                  <span className="badge badge-info" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icon name="bot" size={14} /> Low Congestion
                  </span>
                )}
              </div>
              <Link href={`${ROUTES.CHAT}?q=${encodeURIComponent(`Give me step-by-step directions: ${route.description}`)}`}
                className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)", width: "100%", justifyContent: "center" }}>
                Get Detailed AI Directions
              </Link>
            </div>
          )}

          <div className="card card-solid">
            <h3 style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-3)" }}>Zone Types</h3>
            {[
              { iconKey: "chair" as IconKey, label: "Seating Areas", color: "var(--color-brand-primary)" },
              { iconKey: "door" as IconKey, label: "Entry/Exit", color: "var(--color-brand-accent)" },
              { iconKey: "utensils" as IconKey, label: "Food & Beverage", color: "var(--color-brand-secondary)" },
              { iconKey: "plusSquare" as IconKey, label: "Medical & First Aid", color: "var(--color-brand-danger)" },
            ].map((z) => (
              <div key={z.label} className="flex items-center gap-2" style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-xs)" }}>
                <span style={{ color: z.color, display: "inline-flex" }}><Icon name={z.iconKey} size={18} /></span>
                <span style={{ color: "var(--text-secondary)" }}>{z.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--surface-glass-border)", position: "relative" }}>
          <StadiumMapSVG venue={venue} route={route} />
          {!fromId && !toId && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "hsla(220,20%,7%,0.5)", borderRadius: "var(--radius-xl)" }}>
              <div style={{ textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Icon name="stadium" size={44} style={{ color: "var(--text-muted)", marginBottom: "var(--space-2)" }} />
                <p style={{ fontSize: "var(--text-sm)" }}>Select start and destination to view route</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
