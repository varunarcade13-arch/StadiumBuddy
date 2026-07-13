// ─── App Route Constants ────────────────────────────────────────────────────────
// Single source of truth for all Next.js routes

export const ROUTES = {
  HOME: "/",
  // Fan routes
  CHAT: "/chat",
  NAVIGATE: "/navigate",
  TRANSPORT: "/transport",
  MATCH: "/match",
  SUSTAINABILITY: "/sustainability",
  // Operations routes
  DASHBOARD: "/ops/dashboard",
  CROWD: "/ops/crowd",
  EMERGENCY: "/ops/emergency",
  // API routes
  API: {
    CHAT: "/api/chat",
    CROWD: "/api/crowd",
    NAVIGATION: "/api/navigation",
    TRANSPORT: "/api/transport",
    ALERTS: "/api/alerts",
    SUSTAINABILITY: "/api/sustainability",
    HEALTH: "/api/health",
  },
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
