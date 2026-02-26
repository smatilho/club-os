export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
  "4xl": "5rem",
} as const;

export const radii = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const fontFamily = {
  sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

export const fontSize = {
  xs: "0.75rem",
  sm: "0.8125rem",
  base: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "2rem",
  "4xl": "2.5rem",
  "5xl": "3rem",
} as const;

export const lineHeight = {
  tight: "1.2",
  snug: "1.35",
  normal: "1.5",
  relaxed: "1.75",
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
  lg: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04)",
  xl: "0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.06)",
} as const;

export const adminTheme = {
  bg: "#0d0d0d",
  surface: "#161616",
  surfaceHover: "#1a1a1a",
  surfaceRaised: "#1e1e1e",
  border: "#2a2a2a",
  borderHover: "#3a3a3a",
  text: "#e0ddd5",
  textMuted: "#999",
  textDim: "#666",
  accent: "#c8a55a",
  accentHover: "#d4b36a",
  error: "#e53e3e",
  success: "#38a169",
  warning: "#d69e2e",
} as const;

export const publicThemeDefaults = {
  primaryColor: "#1a365d",
  primaryLight: "#2a4a7f",
  primaryDark: "#0f2340",
  accentColor: "#c6a35c",
  accentHover: "#d4b36a",
  surfaceColor: "#f7f5f0",
  surfaceAlt: "#efeee9",
  textColor: "#1a1a1a",
  textMuted: "#5a5a5a",
  borderColor: "#e5e3de",
  headerHeight: "4rem",
  footerBg: "#111827",
} as const;
