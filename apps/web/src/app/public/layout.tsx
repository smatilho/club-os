import type { ReactNode } from "react";
import { publicApiFetch } from "../../lib/api-client";

interface ThemeSettings {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
}

const FALLBACK_THEME: ThemeSettings = {
  brandName: "Club OS",
  logoUrl: null,
  primaryColor: "#1a365d",
  accentColor: "#c6a35c",
  surfaceColor: "#f7f5f0",
  textColor: "#1a1a1a",
};

async function getTheme(): Promise<ThemeSettings> {
  try {
    const result = await publicApiFetch<ThemeSettings>(
      "/api/org-profile/public/theme",
    );
    if (result.ok) return result.data;
  } catch {
    // API unavailable — use fallback
  }
  return FALLBACK_THEME;
}

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = await getTheme();

  const cssVars = {
    "--brand-primary": theme.primaryColor,
    "--brand-accent": theme.accentColor,
    "--brand-surface": theme.surfaceColor,
    "--brand-text": theme.textColor,
  } as React.CSSProperties;

  return (
    <div style={cssVars} data-testid="public-layout">
      <header
        style={{
          backgroundColor: theme.primaryColor,
          color: theme.surfaceColor,
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          {theme.logoUrl && (
            <img
              src={theme.logoUrl}
              alt={`${theme.brandName} logo`}
              style={{ height: "2rem" }}
            />
          )}
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.25rem",
              letterSpacing: "-0.01em",
            }}
          >
            {theme.brandName}
          </span>
        </nav>
      </header>
      <main
        style={{
          backgroundColor: theme.surfaceColor,
          color: theme.textColor,
          minHeight: "calc(100vh - 4rem)",
          padding: "2rem",
        }}
      >
        {children}
      </main>
    </div>
  );
}
