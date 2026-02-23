"use client";

import { useState, useEffect } from "react";

interface ThemeSettings {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
}

const DEFAULT_THEME: ThemeSettings = {
  brandName: "Club OS",
  logoUrl: null,
  primaryColor: "#1a365d",
  accentColor: "#c6a35c",
  surfaceColor: "#f7f5f0",
  textColor: "#1a1a1a",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
  fontWeight: 500,
  color: "#888",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  backgroundColor: "#1e1e1e",
  border: "1px solid #333",
  borderRadius: "4px",
  color: "#e0ddd5",
  outline: "none",
  boxSizing: "border-box",
};

export default function BrandingSettingsPage() {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch("/api/cms/org-profile/theme");
        if (res.ok) {
          const json = await res.json();
          setTheme(json.data);
        }
      } catch {
        // Use defaults
      }
      setLoading(false);
    }
    loadTheme();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/cms/org-profile/theme", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(theme),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setTheme(json.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Unable to connect to API");
    }
    setSaving(false);
  }

  function updateField(
    field: Exclude<keyof ThemeSettings, "logoUrl">,
    value: string,
  ) {
    setTheme((prev) => ({ ...prev, [field]: value }));
  }

  function updateLogoUrl(value: string) {
    setTheme((prev) => ({
      ...prev,
      logoUrl: value.trim() === "" ? null : value,
    }));
  }

  if (loading) {
    return (
      <div style={{ maxWidth: "64rem", margin: "0 auto", color: "#666" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: "0 0 1.5rem",
          color: "#e0ddd5",
        }}
      >
        Branding Settings
      </h1>

      {error && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "4px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Form */}
        <form onSubmit={handleSave}>
          <div
            style={{
              backgroundColor: "#161616",
              borderRadius: "6px",
              border: "1px solid #2a2a2a",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div>
              <label htmlFor="brandName" style={labelStyle}>
                Brand Name
              </label>
              <input
                id="brandName"
                type="text"
                value={theme.brandName}
                onChange={(e) => updateField("brandName", e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="logoUrl" style={labelStyle}>
                Logo URL
              </label>
              <input
                id="logoUrl"
                type="text"
                value={theme.logoUrl ?? ""}
                onChange={(e) => updateLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                style={inputStyle}
              />
            </div>

            {(
              [
                ["primaryColor", "Primary Color"],
                ["accentColor", "Accent Color"],
                ["surfaceColor", "Surface Color"],
                ["textColor", "Text Color"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label htmlFor={field} style={labelStyle}>
                  {label}
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    type="color"
                    value={theme[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      padding: "0.125rem",
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #333",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <input
                    id={field}
                    type="text"
                    value={theme[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    pattern="^#[0-9a-fA-F]{6}$"
                    style={{
                      ...inputStyle,
                      fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                      fontSize: "0.8125rem",
                      flex: 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "1.25rem",
            }}
          >
            {success && (
              <span style={{ color: "#50b464", fontSize: "0.8125rem" }}>
                Saved
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#0d0d0d",
                backgroundColor: saving ? "#8a7340" : "#c8a55a",
                border: "none",
                borderRadius: "4px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Theme"}
            </button>
          </div>
        </form>

        {/* Live Preview */}
        <div>
          <div
            style={{
              ...labelStyle,
              marginBottom: "0.75rem",
            }}
          >
            Preview
          </div>
          <div
            style={{
              borderRadius: "6px",
              border: "1px solid #2a2a2a",
              overflow: "hidden",
            }}
          >
            {/* Preview header */}
            <div
              style={{
                backgroundColor: theme.primaryColor,
                color: theme.surfaceColor,
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {theme.logoUrl && (
                <img
                  src={theme.logoUrl}
                  alt="Logo preview"
                  style={{
                    height: "1.25rem",
                    objectFit: "contain",
                  }}
                />
              )}
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {theme.brandName}
              </span>
            </div>
            {/* Preview body */}
            <div
              style={{
                backgroundColor: theme.surfaceColor,
                color: theme.textColor,
                padding: "1.25rem 1rem",
                minHeight: "8rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  margin: "0 0 0.5rem",
                }}
              >
                Sample Page Title
              </h3>
              <p
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  margin: 0,
                  opacity: 0.8,
                }}
              >
                This is how your public-facing content will appear to visitors.
                The header uses your primary color and brand name.
              </p>
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: theme.accentColor,
                  color: theme.primaryColor,
                  display: "inline-block",
                  borderRadius: "3px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Accent Element
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
