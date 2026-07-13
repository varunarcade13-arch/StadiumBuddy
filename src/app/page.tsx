"use client";

import Link from "next/link";
import { VENUES } from "@/lib/constants/venues";
import { ROUTES } from "@/lib/constants/routes";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";

// ─── Inline SVG Icons (Lucide-style, no library needed) ──────────────────────
function Icon({ d, size = 20, stroke = "currentColor", ...props }: {
  d: string | readonly string[]; size?: number; stroke?: string;
  className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      {...props}>
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

// Icon path definitions
const ICONS = {
  bot:        ["M12 8V4H8", "M12 8V4h4", "M3 12a9 9 0 1018 0 9 9 0 00-18 0", "M9 12h.01M15 12h.01"],
  map:        ["M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"],
  train:      ["M4 15l2-8h12l2 8", "M4 15h16", "M9 15v4m6-4v4", "M9 7h6"],
  gauge:      ["M12 2a10 10 0 100 20A10 10 0 0012 2", "M12 12l4-4"],
  alertTriangle: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  leaf:       ["M11 20A7 7 0 014 13c0-4.6 3.4-8 8-8 1.7 0 3.3.6 4.5 1.5M21 3l-7 9M11 20l2-9"],
  stadium:    ["M3 9h18M3 15h18", "M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"],
  dashboard:  ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  home:       ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  messageSquare: ["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"],
  trophy:     ["M8 21h8M12 17v4M5 3h14", "M5 3a7 7 0 007 10A7 7 0 0019 3"],
  cpu:        ["M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"],
  zap:        ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  recycle:    ["M7 19H4a2 2 0 01-2-2V7a2 2 0 012-2h3m10 14h3a2 2 0 002-2V7a2 2 0 00-2-2h-3M8 19l4-4 4 4M12 3v12"],
  droplet:    ["M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"],
  battery:    ["M17 7H7a5 5 0 000 10h10a5 5 0 000-10z", "M22 11v2"],
  shoppingBag:["M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 01-8 0"],
  users:      ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
  arrowRight: ["M5 12h14M12 5l7 7-7 7"],
  chevronRight: ["M9 18l6-6-6-6"],
  volume2:    ["M11 5L6 9H2v6h4l5 4V5z", "M15.54 8.46a5 5 0 010 7.07"],
  volumeX:    ["M11 5L6 9H2v6h4l5 4V5z", "M23 9l-6 6M17 9l6 6"],
  mic:        ["M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z", "M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"],
  micOff:     ["M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6", "M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"],
  navigation: ["M3 11l19-9-9 19-2-8-8-2z"],
  send:       ["M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"],
  globe:      ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M2 12h20", "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"],
} as const;

const FEATURES = [
  {
    iconKey: "messageSquare" as keyof typeof ICONS,
    title: "AI Chat Assistant",
    desc: "Ask anything – navigation, food, transport, emergencies – in 10 languages with voice support.",
    href: ROUTES.CHAT,
    color: "var(--color-brand-primary)",
  },
  {
    iconKey: "map" as keyof typeof ICONS,
    title: "Crowd-Aware Navigation",
    desc: "Real-time stadium maps with AI-optimized routes that avoid congested areas.",
    href: ROUTES.NAVIGATE,
    color: "var(--color-brand-accent)",
  },
  {
    iconKey: "train" as keyof typeof ICONS,
    title: "Smart Transport Planner",
    desc: "Predict the best time to leave and which transit line to take based on live crowd data.",
    href: ROUTES.TRANSPORT,
    color: "var(--color-brand-secondary)",
  },
  {
    iconKey: "gauge" as keyof typeof ICONS,
    title: "Operations Dashboard",
    desc: "Command center for stadium staff with AI-powered anomaly detection and alerts.",
    href: ROUTES.DASHBOARD,
    color: "var(--color-brand-primary)",
  },
  {
    iconKey: "alertTriangle" as keyof typeof ICONS,
    title: "Emergency Console",
    desc: "Instant AI-generated evacuation protocols and zone-specific emergency guidance.",
    href: ROUTES.EMERGENCY,
    color: "var(--color-brand-danger)",
  },
  {
    iconKey: "leaf" as keyof typeof ICONS,
    title: "Sustainability Hub",
    desc: "Track venue-wide eco metrics and get personalized tips to reduce your carbon footprint.",
    href: ROUTES.SUSTAINABILITY,
    color: "var(--density-low)",
  },
] as const;


const STATS = [
  { value: "16", label: "Venues", sub: "Across USA, Canada & Mexico" },
  { value: "48", label: "Teams", sub: "From 6 continents" },
  { value: "10", label: "Languages", sub: "AI-powered translation" },
  { value: "80K+", label: "Fans/venue", sub: "Real-time crowd guidance" },
] as const;

export default function HomePage() {
  const featuredVenues = VENUES.slice(0, 3);

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }}>
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: "var(--z-sticky)",
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-8)",
          background: "var(--surface-header)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--surface-glass-border)",
        }}
      >
        <a href="#main-content" className="skip-nav">Skip to content</a>
        <Logo size={32} />
        <nav aria-label="Main navigation">
          <ul
            style={{
              display: "flex",
              gap: "var(--space-2)",
              listStyle: "none",
            }}
          >
            <li>
              <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">
                Open AI Assistant
              </Link>
            </li>
            <li>
              <Link href={ROUTES.DASHBOARD} className="btn btn-secondary btn-sm">
                Ops Dashboard
              </Link>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="hero-heading"
          style={{
            padding: "var(--space-10) var(--space-8) var(--space-10)",
            textAlign: "center",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              background: "hsla(38, 55%, 56%, 0.12)",
              border: "1px solid hsla(38, 55%, 56%, 0.22)",
              borderRadius: "var(--radius-full)",
              marginBottom: "var(--space-6)",
              fontSize: "var(--text-sm)",
              color: "hsl(38, 55%, 68%)",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            <Icon d={ICONS.trophy} size={16} aria-hidden />
            FIFA WORLD CUP 2026 — OFFICIAL AI COMPANION
          </div>

          <h1
            id="hero-heading"
            className="animate-fade-in-up"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              fontWeight: "var(--weight-black)",
              lineHeight: 1.1,
              marginBottom: "var(--space-6)",
              color: "var(--text-primary)",
              animationDelay: "100ms",
            }}
          >
            Your AI{" "}
            <span style={{ color: "var(--color-brand-primary)" }}>
              Stadium Companion
            </span>
            <br />
            for the World Cup
          </h1>

          <p
            className="animate-fade-in-up"
            style={{
              fontSize: "var(--text-xl)",
              color: "var(--text-secondary)",
              lineHeight: "var(--leading-relaxed)",
              marginBottom: "var(--space-10)",
              maxWidth: "600px",
              margin: "0 auto var(--space-10)",
              animationDelay: "200ms",
            }}
          >
            Real-time crowd navigation, multilingual AI chat, emergency guidance, and
            smart transport planning — powered by Gemini AI.
          </p>

          <div
            className="flex animate-fade-in-up"
            style={{
              justifyContent: "center",
              gap: "var(--space-4)",
              flexWrap: "wrap",
              animationDelay: "300ms",
            }}
          >
            <Link
              href={ROUTES.CHAT}
              className="btn btn-primary"
              style={{ fontSize: "var(--text-lg)", padding: "var(--space-4) var(--space-8)" }}
            >
              <Icon d={ICONS.messageSquare} size={22} aria-hidden /> Open AI Chat Assistant
            </Link>
            <Link
              href={ROUTES.DASHBOARD}
              className="btn btn-secondary"
              style={{ fontSize: "var(--text-lg)", padding: "var(--space-4) var(--space-8)" }}
            >
              <Icon d={ICONS.gauge} size={22} aria-hidden /> Operations Dashboard
            </Link>
          </div>
        </section>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <section
          aria-label="Platform statistics"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            maxWidth: "var(--content-max)",
            margin: "0 auto var(--space-16)",
            padding: "0 var(--space-8)",
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="stat-card animate-fade-in-up"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="stat-value" aria-label={`${stat.value} ${stat.label}`}>
                {stat.value}
              </div>
              <div className="font-semibold">{stat.label}</div>
              <div className="stat-label">{stat.sub}</div>
            </div>
          ))}
        </section>

        {/* ── Feature Grid ──────────────────────────────────────────────── */}
        <section
          aria-labelledby="features-heading"
          style={{
            maxWidth: "var(--content-max)",
            margin: "0 auto var(--space-16)",
            padding: "0 var(--space-8)",
          }}
        >
          <h2
            id="features-heading"
            style={{
              textAlign: "center",
              marginBottom: "var(--space-12)",
              fontSize: "var(--text-3xl)",
              color: "var(--text-primary)",
              fontWeight: "var(--weight-bold)",
            }}
          >
            Everything You Need,{" "}
            <span style={{ color: "var(--color-brand-primary)" }}>
              AI-Powered
            </span>
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "var(--space-5)",
            }}
            className="stagger"
          >
            {FEATURES.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="card animate-fade-in-up"
                style={{
                  textDecoration: "none",
                  cursor: "pointer",
                  border: "1px solid var(--surface-glass-border)",
                  display: "block",
                }}
                aria-label={`${feature.title}: ${feature.desc}`}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 52,
                    height: 52,
                    borderRadius: "var(--radius-md)",
                    background: "hsla(215, 90%, 65%, 0.08)",
                    border: "1px solid hsla(215, 90%, 65%, 0.16)",
                    marginBottom: "var(--space-4)",
                    color: "var(--color-brand-primary)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Icon d={ICONS[feature.iconKey]} size={28} />
                </div>
                <h3
                  style={{
                    fontSize: "var(--text-lg)",
                    marginBottom: "var(--space-2)",
                    color: "var(--text-primary)",
                    fontWeight: "var(--weight-semibold)",
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
                  {feature.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Venues Section ────────────────────────────────────────────── */}
        <section
          aria-labelledby="venues-heading"
          style={{
            maxWidth: "var(--content-max)",
            margin: "0 auto var(--space-20)",
            padding: "0 var(--space-8)",
          }}
        >
          <h2
            id="venues-heading"
            style={{ textAlign: "center", marginBottom: "var(--space-8)" }}
          >
            Featured Venues
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-5)",
            }}
          >
            {featuredVenues.map((venue) => (
              <div key={venue.id} className="card card-solid">
                <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-3)" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 42, height: 42, borderRadius: "var(--radius-md)",
                    background: "hsla(213, 45%, 58%, 0.12)",
                    border: "1px solid hsla(213, 45%, 58%, 0.18)",
                    color: "var(--color-brand-primary)", flexShrink: 0,
                  }}>
                    <Icon d={ICONS.stadium} size={22} aria-hidden />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "var(--text-base)" }}>{venue.name}</h3>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                      {venue.city}, {venue.state}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2" style={{ marginTop: "var(--space-2)" }}>
                  <span className="badge badge-info">
                    {venue.capacity.toLocaleString()} capacity
                  </span>
                  <span className="badge badge-low">{venue.country}</span>
                </div>
                <div style={{ marginTop: "var(--space-4)" }}>
                  <Link
                    href={`${ROUTES.CHAT}?venue=${venue.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ width: "100%", justifyContent: "center" }}
                    aria-label={`Open AI assistant for ${venue.name}`}
                  >
                    Open AI Assistant
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer
          role="contentinfo"
          style={{
            borderTop: "1px solid var(--surface-glass-border)",
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          <p>
            StadiumBuddy © 2026 · Built for FIFA World Cup 2026 · Powered by Google Gemini AI
          </p>
          <p style={{ marginTop: "var(--space-2)" }}>
            Supporting{" "}
            <abbr title="Web Content Accessibility Guidelines 2.2 AA/AAA">WCAG 2.2 AA/AAA</abbr>{" "}
            · 10 languages · OWASP security standards
          </p>
        </footer>
      </main>
    </div>
  );
}
