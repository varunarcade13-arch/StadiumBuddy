"use client";

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface LogoProps {
  size?: number; // size of the icon (default: 32)
  showText?: boolean; // whether to show the "StadiumBuddy AI" text (default: true)
}

export const Logo = React.memo(function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <Link
      href={ROUTES.HOME}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "12px", // 12-16px proper spacing
        textDecoration: "none",
        color: "inherit",
      }}
      aria-label="StadiumBuddy AI home"
    >
      {/* Dynamic SVG Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Outer Stadium Rim - Elegant Geometric Arena layout */}
        <rect
          x="3"
          y="3"
          width="26"
          height="26"
          rx="8"
          stroke="var(--color-brand-primary)"
          strokeWidth="2"
        />
        {/* Center circle representing football pitch and radar overlay */}
        <circle
          cx="16"
          cy="16"
          r="6"
          stroke="var(--color-brand-primary)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          opacity="0.6"
        />
        {/* Smart Navigation Path */}
        <path
          d="M8 24V16C8 11.5817 11.5817 8 16 8H24"
          stroke="var(--color-brand-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Destination Location Node */}
        <circle
          cx="24"
          cy="8"
          r="3"
          fill="var(--color-brand-primary)"
        />
        {/* AI Neural center node */}
        <circle
          cx="16"
          cy="16"
          r="2.5"
          fill="var(--color-brand-accent)"
        />
      </svg>

      {showText && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-extrabold)",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            StadiumBuddy
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              fontWeight: "var(--weight-bold)",
              background: "hsla(215, 90%, 65%, 0.15)",
              color: "var(--color-brand-primary)",
              padding: "2px 6px",
              borderRadius: "4px",
              lineHeight: 1,
              letterSpacing: "0.05em",
            }}
          >
            AI
          </span>
        </div>
      )}
    </Link>
  );
});
