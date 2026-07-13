"use client";

import React from "react";
import { useTheme } from "@/lib/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn-icon"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        width: 44,
        height: 44,
        borderRadius: "var(--radius-md)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--text-primary)",
        transition: "background var(--transition-fast), transform var(--transition-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-card-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "transform 0.3s ease" }}
      >
        {theme === "dark" ? (
          // Sun Icon
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </>
        ) : (
          // Moon Icon
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        )}
      </svg>
    </button>
  );
}
