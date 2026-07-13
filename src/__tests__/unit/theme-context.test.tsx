import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/context/ThemeContext";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper component to test useTheme hook
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={toggleTheme} data-testid="toggle-btn">Toggle</button>
    </div>
  );
};

describe("ThemeContext & ThemeProvider", () => {
  const originalLocalStorage = global.localStorage;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Setup localStorage mock
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        for (const k in store) delete store[k];
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(global, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Reset document element attribute
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    Object.defineProperty(global, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("loads theme from localStorage if present", () => {
    localStorage.setItem("theme", "light");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to media query prefers-color-scheme dark if not in localStorage", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to media query prefers-color-scheme light if not in localStorage and matches is false", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("toggles theme and updates localStorage and document attributes", async () => {
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");

    const toggleBtn = screen.getByTestId("toggle-btn");
    
    // Toggle to light
    await act(async () => {
      toggleBtn.click();
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Wait for microtask (Promise.resolve().then) to run
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "light");

    // Toggle back to dark
    await act(async () => {
      toggleBtn.click();
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("throws error if useTheme is used outside of ThemeProvider", () => {
    // Suppress console error output for this expected throwing test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTheme must be used within a ThemeProvider");

    consoleSpy.mockRestore();
  });
});
