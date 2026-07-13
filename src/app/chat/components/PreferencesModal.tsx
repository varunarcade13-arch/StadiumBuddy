import React from "react";
import type { UserPreferences } from "@/types/chat.types";
import { Icon } from "@/app/components/Icon";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPrefs: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
}

export function PreferencesModal({ isOpen, onClose, userPrefs, onChange }: PreferencesModalProps) {
  if (!isOpen) return null;

  const handleMobilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...userPrefs, mobilityAssistanceNeeded: e.target.checked });
  };

  const handleTransportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...userPrefs,
      preferredTransport: (e.target.value as UserPreferences["preferredTransport"]) || null,
    });
  };

  const handleSeatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...userPrefs, seatingZone: e.target.value || null });
  };

  const handleDietaryChange = (restriction: string, checked: boolean) => {
    const current = [...userPrefs.dietaryRestrictions];
    let updated: string[];
    if (checked) {
      updated = current.includes(restriction) ? current : [...current, restriction];
    } else {
      updated = current.filter((r) => r !== restriction);
    }
    onChange({ ...userPrefs, dietaryRestrictions: updated });
  };

  const DIETARY_OPTIONS = [
    { value: "vegan", label: "Vegan" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "gluten-free", label: "Gluten-Free" },
    { value: "halal", label: "Halal" },
    { value: "kosher", label: "Kosher" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prefs-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "var(--z-modal)",
        padding: "var(--space-4)",
      }}
    >
      <div
        className="card card-solid"
        style={{
          width: "100%",
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--surface-card)",
          border: "1px solid var(--surface-glass-border)",
          boxShadow: "var(--shadow-xl)",
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-6)",
          }}
        >
          <h2 id="prefs-modal-title" style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)" }}>
            Assistant Preferences
          </h2>
          <button
            onClick={onClose}
            className="btn btn-icon btn-sm"
            aria-label="Close preferences modal"
            style={{ minHeight: "var(--touch-target-min)", minWidth: "var(--touch-target-min)" }}
          >
            <Icon name="stop" size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Mobility Assistance */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                cursor: "pointer",
                minHeight: "var(--touch-target-min)",
              }}
            >
              <input
                type="checkbox"
                checked={userPrefs.mobilityAssistanceNeeded}
                onChange={handleMobilityChange}
                style={{ width: "20px", height: "20px" }}
                aria-label="Request mobility or wheelchair assistance"
              />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}>
                <Icon name="wheelchair" size={18} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />
                Mobility & Wheelchair Assistance
              </span>
            </label>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-1)", paddingLeft: "var(--space-8)" }}>
              Instructs AI to route through elevators, ramps, and step-free navigation paths.
            </p>
          </div>

          {/* Seating Zone */}
          <div>
            <label
              htmlFor="prefs-seating-zone"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-semibold)",
                marginBottom: "var(--space-2)",
              }}
            >
              Your Seating Zone
            </label>
            <input
              id="prefs-seating-zone"
              type="text"
              className="input"
              value={userPrefs.seatingZone || ""}
              onChange={handleSeatingChange}
              placeholder="e.g. Section 115, Row 10"
              style={{ width: "100%", minHeight: "var(--touch-target-min)" }}
            />
          </div>

          {/* Preferred Transportation */}
          <div>
            <label
              htmlFor="prefs-transport"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-semibold)",
                marginBottom: "var(--space-2)",
              }}
            >
              Preferred Departure Transport
            </label>
            <select
              id="prefs-transport"
              className="input"
              value={userPrefs.preferredTransport || ""}
              onChange={handleTransportChange}
              style={{ width: "100%", minHeight: "var(--touch-target-min)" }}
            >
              <option value="">No preference</option>
              <option value="walking">Walking</option>
              <option value="shuttle">Shuttle Bus</option>
              <option value="metro">Metro/Rail</option>
              <option value="taxi">Taxi/Rideshare</option>
            </select>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-semibold)",
                marginBottom: "var(--space-2)",
              }}
            >
              Dietary Preferences
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {DIETARY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    cursor: "pointer",
                    minHeight: "var(--touch-target-min)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={userPrefs.dietaryRestrictions.includes(opt.value)}
                    onChange={(e) => handleDietaryChange(opt.value, e.target.checked)}
                    style={{ width: "18px", height: "18px" }}
                  />
                  <span style={{ fontSize: "var(--text-sm)" }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn btn-primary" style={{ minHeight: "var(--touch-target-min)" }}>
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
