"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@/app/components/Icon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "test") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--gradient-hero)",
            padding: "var(--space-6)",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          <div
            className="card card-solid"
            style={{
              maxWidth: "500px",
              padding: "var(--space-8)",
              background: "var(--surface-card)",
              border: "1px solid var(--color-brand-danger)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "hsla(0, 85%, 60%, 0.12)",
                color: "var(--color-brand-danger)",
                marginBottom: "var(--space-4)",
              }}
            >
              <Icon name="alertTriangle" size={32} />
            </div>
            <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>
              Something went wrong
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this view."}
            </p>
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center" }}>
              <button onClick={this.handleReset} className="btn btn-primary">
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
