"use client";

// ─── Sustainability Hub Page ───────────────────────────────────────────────────

import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import { VENUES } from "@/lib/constants/venues";
import { SustainabilityService } from "@/lib/services/services";
import { ROUTES } from "@/lib/constants/routes";

const sustainabilityService = new SustainabilityService();

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
  zap:         ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  recycle:     ["M1 4v6h6", "M23 20v-6h-6", "M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"],
  droplet:     ["M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"],
  leaf:        ["M11 20A7 7 0 014 13c0-4.6 3.4-8 8-8 1.7 0 3.3.6 4.5 1.5M21 3l-7 9M11 20l2-9"],
  battery:     ["M17 7H7a5 5 0 000 10h10a5 5 0 000-10z", "M22 11v2"],
  shoppingBag: ["M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z", "M3 6h18", "M16 10a4 4 0 01-8 0"],
  users:       ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
  globe:       ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M2 12h20", "M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"],
  check:       ["M20 6L9 17l-5-5"],
  arrowLeft:   ["M19 12H5M12 19l-7-7 7-7"],
};

export default function SustainabilityPage() {
  const venueId = "metlife";
  const venue = VENUES.find((v) => v.id === venueId);
  const metrics = sustainabilityService.getVenueMetrics(venueId);
  const tips = sustainabilityService.getEcoTips();

  const METRIC_CARDS = [
    { value: metrics.energySavedKwh.toLocaleString(), unit: "kWh", label: "Energy Saved", iconKey: "zap" as keyof typeof ICONS, color: "var(--color-brand-secondary)" },
    { value: `${metrics.wasteRecycledPercent}%`, unit: "", label: "Waste Recycled", iconKey: "recycle" as keyof typeof ICONS, color: "var(--density-low)" },
    { value: metrics.waterSavedLiters.toLocaleString(), unit: "L", label: "Water Saved", iconKey: "droplet" as keyof typeof ICONS, color: "hsl(200, 52%, 52%)" },
    { value: metrics.carbonOffsetTons.toLocaleString(), unit: "tons", label: "Carbon Offset", iconKey: "leaf" as keyof typeof ICONS, color: "var(--density-low)" },
    { value: `${metrics.evChargingUtilizationPercent}%`, unit: "", label: "EV Charging Use", iconKey: "battery" as keyof typeof ICONS, color: "hsl(190, 75%, 48%)" },
    { value: `${metrics.localFoodPercent}%`, unit: "", label: "Local Food Sourced", iconKey: "shoppingBag" as keyof typeof ICONS, color: "hsl(38, 55%, 56%)" },
    { value: metrics.fanTipsAdopted.toLocaleString(), unit: "", label: "Fans Helped", iconKey: "users" as keyof typeof ICONS, color: "var(--color-brand-primary)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-hero)" }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 var(--space-6)", height: "var(--header-height)",
        borderBottom: "1px solid var(--surface-glass-border)",
        background: "var(--surface-header)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: "var(--z-sticky)",
      }}>
        <a href="#main-content" className="skip-nav">Skip to sustainability hub</a>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="btn btn-icon btn-sm" aria-label="Back">
            <Icon d={ICONS.arrowLeft} size={20} />
          </Link>
          <Logo size={28} />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginLeft: "var(--space-2)" }}>Sustainability</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={ROUTES.CHAT} className="btn btn-primary btn-sm">AI Eco Tips</Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" style={{ padding: "var(--space-8)", maxWidth: "var(--content-max)", margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-12)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 80, height: 80, borderRadius: "50%",
            background: "hsla(158, 35%, 44%, 0.14)", border: "1px solid hsla(158, 35%, 44%, 0.22)",
            color: "var(--density-low)", marginBottom: "var(--space-4)" }}>
            <Icon d={ICONS.globe} size={44} />
          </div>
          <h1 style={{ fontSize: "var(--text-4xl)", marginBottom: "var(--space-4)", color: "var(--text-primary)" }}>
            FIFA World Cup 2026{" "}
            <span style={{ color: "var(--density-low)" }}>
              Sustainability
            </span>
          </h1>
          <p style={{ fontSize: "var(--text-xl)", color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto" }}>
            Together, we&apos;re making the 2026 World Cup the most sustainable in history. Track our progress and see how you can help.
          </p>
        </div>

        {/* Metrics Grid */}
        <section aria-labelledby="metrics-title" style={{ marginBottom: "var(--space-12)" }}>
          <h2 id="metrics-title" style={{ marginBottom: "var(--space-6)", textAlign: "center" }}>Live Sustainability Metrics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }} className="stagger">
            {METRIC_CARDS.map((metric) => (
              <div key={metric.label} className="stat-card animate-fade-in-up" style={{ textAlign: "center", borderTop: `2px solid ${metric.color}40` }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 48, height: 48, borderRadius: "var(--radius-md)",
                  background: `${metric.color}18`, border: `1px solid ${metric.color}25`,
                  color: metric.color, marginBottom: "var(--space-3)" }}>
                  <Icon d={ICONS[metric.iconKey]} size={24} />
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)", color: metric.color }}>
                  {metric.value}
                  {metric.unit && <span style={{ fontSize: "var(--text-base)", marginLeft: "var(--space-1)" }}>{metric.unit}</span>}
                </div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Venue Features */}
        {venue && (
          <section aria-labelledby="venue-features-title" style={{ marginBottom: "var(--space-12)" }}>
            <h2 id="venue-features-title" style={{ marginBottom: "var(--space-6)" }}>{venue.name} Green Features</h2>
            <div className="grid-2">
              {venue.sustainabilityFeatures.map((feature) => (
                <div key={feature} className="card" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)" }}>
                  <div style={{ color: "var(--density-low)", flexShrink: 0, marginTop: 2 }}>
                    <Icon d={ICONS.check} size={20} />
                  </div>
                  <span style={{ fontSize: "var(--text-sm)" }}>{feature}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Eco Tips */}
        <section aria-labelledby="tips-title" style={{ marginBottom: "var(--space-12)" }}>
          <h2 id="tips-title" style={{ marginBottom: "var(--space-6)" }}>How You Can Help Today</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {tips.map((tip, i) => (
              <div key={i} className="card animate-fade-in-up" style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)", animationDelay: `${i * 80}ms` }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--radius-md)",
                  background: "hsla(158, 35%, 44%, 0.18)",
                  border: "1px solid hsla(158, 35%, 44%, 0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--density-low)", fontWeight: "var(--weight-semibold)", fontSize: "var(--text-sm)",
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ lineHeight: "var(--leading-relaxed)" }}>{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI CTA */}
        <div className="card" style={{ textAlign: "center", background: "linear-gradient(135deg, hsla(158,35%,20%,0.4) 0%, hsla(190,35%,20%,0.4) 100%)", border: "1px solid hsla(158,35%,40%,0.22)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: "var(--radius-lg)",
            background: "hsla(213, 45%, 58%, 0.14)", border: "1px solid hsla(213, 45%, 58%, 0.22)",
            color: "var(--color-brand-primary)", marginBottom: "var(--space-4)" }}>
            <Icon d={["M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"]} size={32} />
          </div>
          <h2 style={{ marginBottom: "var(--space-3)" }}>Get Personalized Eco Tips</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>Ask our AI assistant for personalized sustainability recommendations based on your travel plans and preferences.</p>
          <Link href={`${ROUTES.CHAT}?q=${encodeURIComponent("Give me personalized eco-friendly tips for attending the World Cup")}`} className="btn btn-primary">
            Ask AI for Eco Tips
          </Link>
        </div>
      </main>
    </div>
  );
}
