import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StadiumBuddy – FIFA World Cup 2026 AI Assistant",
    template: "%s | StadiumBuddy",
  },
  description:
    "Your intelligent AI companion for the FIFA World Cup 2026. Get real-time stadium navigation, crowd-aware routing, transport planning, and personalized match-day assistance in 10 languages.",
  keywords: [
    "FIFA World Cup 2026",
    "stadium navigation",
    "AI assistant",
    "crowd management",
    "accessibility",
    "fan experience",
  ],
  authors: [{ name: "StadiumBuddy Team" }],
  creator: "StadiumBuddy",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "StadiumBuddy – FIFA World Cup 2026 AI Assistant",
    description:
      "Real-time AI guidance for fans, staff, and emergency teams at FIFA World Cup 2026.",
    siteName: "StadiumBuddy",
  },
  twitter: {
    card: "summary_large_image",
    title: "StadiumBuddy – FIFA World Cup 2026",
    description: "AI-powered stadium companion for World Cup 2026",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
  ],
};

import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const saved = localStorage.getItem('theme');
                if (saved === 'dark' || saved === 'light') {
                  document.documentElement.setAttribute('data-theme', saved);
                } else {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                }
              } catch (e) {}
            })();
          `
        }} />
      </head>
      <body>
        <ThemeProvider>
          <ErrorBoundary>
            {/* Skip Navigation – WCAG 2.4.1 */}
            <a href="#main-content" className="skip-nav">
              Skip to main content
            </a>
            {/* ARIA live region for global announcements */}
            <div
              id="global-announcer"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            />
            {/* Emergency announcer – urgent priority */}
            <div
              id="emergency-announcer"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="sr-only"
            />
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
