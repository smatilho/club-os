import React from "react";
import { spacing, radii, fontSize, fontWeight, fontFamily, shadows, lineHeight } from "../tokens";

// --- Container ---
export function Container({
  children,
  maxWidth = "1100px",
  style,
}: {
  children: React.ReactNode;
  maxWidth?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        maxWidth,
        marginLeft: "auto",
        marginRight: "auto",
        paddingLeft: spacing.xl,
        paddingRight: spacing.xl,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Stack ---
export function Stack({
  children,
  gap = spacing.md,
  direction = "column",
  align,
  justify,
  style,
}: {
  children: React.ReactNode;
  gap?: string;
  direction?: "row" | "column";
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Grid ---
export function Grid({
  children,
  columns = 3,
  gap = spacing.lg,
  style,
}: {
  children: React.ReactNode;
  columns?: number;
  gap?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Heading ---
export function Heading({
  level = 2,
  children,
  style,
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const sizeMap: Record<number, string> = {
    1: fontSize["4xl"],
    2: fontSize["3xl"],
    3: fontSize["2xl"],
    4: fontSize.xl,
    5: fontSize.lg,
    6: fontSize.md,
  };
  const weightMap: Record<number, number> = {
    1: fontWeight.extrabold,
    2: fontWeight.bold,
    3: fontWeight.bold,
    4: fontWeight.semibold,
    5: fontWeight.semibold,
    6: fontWeight.medium,
  };
  const headingStyle: React.CSSProperties = {
    fontSize: sizeMap[level],
    fontWeight: weightMap[level],
    fontFamily: fontFamily.sans,
    margin: 0,
    lineHeight: lineHeight.tight,
    letterSpacing: level <= 2 ? "-0.02em" : undefined,
    ...style,
  };
  if (level === 1) return <h1 style={headingStyle}>{children}</h1>;
  if (level === 3) return <h3 style={headingStyle}>{children}</h3>;
  if (level === 4) return <h4 style={headingStyle}>{children}</h4>;
  if (level === 5) return <h5 style={headingStyle}>{children}</h5>;
  if (level === 6) return <h6 style={headingStyle}>{children}</h6>;
  return <h2 style={headingStyle}>{children}</h2>;
}

// --- Button ---
export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  style,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  href?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: `${spacing.xs} ${spacing.md}`, fontSize: fontSize.sm },
    md: { padding: `${spacing.sm} ${spacing.lg}`, fontSize: fontSize.base },
    lg: { padding: `${spacing.md} ${spacing.xl}`, fontSize: fontSize.md },
  };
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.sans,
    borderRadius: radii.md,
    textDecoration: "none",
    cursor: "pointer",
    border: "none",
    letterSpacing: "0.01em",
    transition: "background-color 200ms ease, transform 100ms ease, box-shadow 200ms ease",
    ...sizeStyles[size],
    ...style,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: "var(--brand-primary, #1a365d)", color: "#fff", boxShadow: shadows.sm },
    secondary: { backgroundColor: "transparent", color: "var(--brand-primary, #1a365d)", border: "2px solid var(--brand-primary, #1a365d)" },
    ghost: { backgroundColor: "transparent", color: "var(--brand-primary, #1a365d)" },
    accent: { backgroundColor: "var(--brand-accent, #c6a35c)", color: "#fff", boxShadow: shadows.md },
  };

  const merged = { ...baseStyle, ...variantStyles[variant] };

  if (href) {
    return <a href={href} style={merged}>{children}</a>;
  }
  return <button style={merged} onClick={onClick}>{children}</button>;
}

// --- Card ---
export function Card({
  children,
  elevated = true,
  style,
}: {
  children: React.ReactNode;
  elevated?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: radii.lg,
        padding: spacing.lg,
        boxShadow: elevated ? shadows.md : "none",
        border: elevated ? "none" : "1px solid #e5e3de",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- SectionWrapper ---
export function SectionWrapper({
  children,
  background = "default",
  style,
}: {
  children: React.ReactNode;
  background?: "default" | "alt" | "dark" | "primary";
  style?: React.CSSProperties;
}) {
  const bgMap: Record<string, React.CSSProperties> = {
    default: {},
    alt: { backgroundColor: "#f5f4f0" },
    dark: { backgroundColor: "var(--brand-primary, #1a365d)", color: "#fff" },
    primary: { backgroundColor: "var(--brand-primary, #1a365d)", color: "#fff" },
  };
  return (
    <section
      style={{
        padding: `${spacing["3xl"]} 0`,
        ...bgMap[background],
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// --- Badge ---
export function Badge({
  children,
  variant = "default",
  style,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
  style?: React.CSSProperties;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    default: { bg: "#e5e3de", text: "#444" },
    success: { bg: "#dcfce7", text: "#166534" },
    warning: { bg: "#fef9c3", text: "#854d0e" },
    error: { bg: "#fee2e2", text: "#991b1b" },
  };
  const colors = colorMap[variant] ?? colorMap["default"]!;
  return (
    <span
      style={{
        display: "inline-block",
        padding: `3px ${spacing.sm}`,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        borderRadius: radii.full,
        backgroundColor: colors!.bg,
        color: colors!.text,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// --- Alert ---
export function Alert({
  children,
  variant = "info",
  title,
  style,
}: {
  children: React.ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  style?: React.CSSProperties;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "#3b82f6" },
    success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "#22c55e" },
    warning: { bg: "#fefce8", border: "#fde047", text: "#854d0e", icon: "#eab308" },
    error: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", icon: "#ef4444" },
  };
  const colors = colorMap[variant] ?? colorMap["info"]!;
  return (
    <div
      role="alert"
      style={{
        padding: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: colors!.bg,
        borderLeft: `4px solid ${colors!.border}`,
        color: colors!.text,
        fontSize: fontSize.md,
        lineHeight: lineHeight.normal,
        ...style,
      }}
    >
      {title && (
        <div style={{ fontWeight: fontWeight.bold, marginBottom: spacing.xs, fontSize: fontSize.lg }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
