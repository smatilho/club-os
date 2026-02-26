import type { ReactNode } from "react";
import { publicApiFetch } from "../../lib/api-client";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  shadows,
  radii,
  publicThemeDefaults,
} from "@club-os/ui-kit";

interface ThemeSettings {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
}

interface NavMenuItem {
  id: string;
  label: string;
  linkTarget: string;
  parentId: string | null;
  sortOrder: number;
}

const FALLBACK_THEME: ThemeSettings = {
  brandName: "Club OS",
  logoUrl: null,
  primaryColor: publicThemeDefaults.primaryColor,
  accentColor: publicThemeDefaults.accentColor,
  surfaceColor: publicThemeDefaults.surfaceColor,
  textColor: publicThemeDefaults.textColor,
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

async function getMenuItems(
  location: string,
): Promise<NavMenuItem[]> {
  try {
    const result = await publicApiFetch<NavMenuItem[]>(
      `/api/navigation/menus/${location}`,
    );
    if (result.ok) return result.data;
  } catch {
    // API unavailable
  }
  return [];
}

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, headerItems, footerItems] = await Promise.all([
    getTheme(),
    getMenuItems("public_header"),
    getMenuItems("public_footer"),
  ]);

  const cssVars = {
    "--brand-primary": theme.primaryColor,
    "--brand-accent": theme.accentColor,
    "--brand-surface": theme.surfaceColor,
    "--brand-text": theme.textColor,
  } as React.CSSProperties;

  const topLevelHeader = headerItems.filter((i) => !i.parentId);
  const topLevelFooter = footerItems.filter((i) => !i.parentId);

  return (
    <div style={cssVars} data-testid="public-layout">
      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor} 0%, color-mix(in srgb, ${theme.primaryColor}, #000 15%) 100%)`,
          color: "#fff",
          padding: `0 ${spacing.xl}`,
          fontFamily: fontFamily.sans,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: shadows.md,
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "4rem",
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <a
            href="/public"
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {theme.logoUrl && (
              <img
                src={theme.logoUrl}
                alt={`${theme.brandName} logo`}
                style={{ height: "2.25rem" }}
              />
            )}
            <span
              style={{
                fontWeight: fontWeight.bold,
                fontSize: fontSize.xl,
                letterSpacing: "-0.02em",
              }}
            >
              {theme.brandName}
            </span>
          </a>
          {topLevelHeader.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              {topLevelHeader.map((item) => (
                <a
                  key={item.id}
                  href={item.linkTarget}
                  style={{
                    padding: `${spacing.xs} ${spacing.md}`,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.medium,
                    color: "rgba(255,255,255,0.9)",
                    textDecoration: "none",
                    borderRadius: radii.md,
                    letterSpacing: "0.01em",
                    transition: "background-color 150ms ease, color 150ms ease",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </nav>
      </header>

      {/* Main — no padding; blocks handle their own spacing via SectionWrapper */}
      <main
        style={{
          backgroundColor: theme.surfaceColor,
          color: theme.textColor,
          minHeight: "calc(100vh - 4rem - 12rem)",
          fontFamily: fontFamily.sans,
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: publicThemeDefaults.footerBg,
          color: "rgba(255,255,255,0.85)",
          fontFamily: fontFamily.sans,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            marginLeft: "auto",
            marginRight: "auto",
            padding: `${spacing["3xl"]} ${spacing.xl} ${spacing.xl}`,
          }}
        >
          {/* Footer top row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: spacing.xl,
              paddingBottom: spacing.xl,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.lg,
                  color: "#fff",
                  marginBottom: spacing.sm,
                  letterSpacing: "-0.01em",
                }}
              >
                {theme.brandName}
              </div>
              <div
                style={{
                  fontSize: fontSize.sm,
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.6",
                }}
              >
                Community. Wellness. Excellence.
              </div>
            </div>
            {topLevelFooter.length > 0 && (
              <nav
                style={{
                  display: "flex",
                  gap: spacing.lg,
                  flexWrap: "wrap",
                }}
              >
                {topLevelFooter.map((item) => (
                  <a
                    key={item.id}
                    href={item.linkTarget}
                    style={{
                      color: "rgba(255,255,255,0.65)",
                      textDecoration: "none",
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                      letterSpacing: "0.01em",
                      transition: "color 150ms ease",
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          {/* Footer bottom row */}
          <div
            style={{
              paddingTop: spacing.lg,
              fontSize: fontSize.xs,
              color: "rgba(255,255,255,0.35)",
              textAlign: "center",
            }}
          >
            &copy; {new Date().getFullYear()} {theme.brandName}. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
