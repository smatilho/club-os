import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession, hasCapability, isAuthenticated } from "../../lib/session";
import { apiFetch } from "../../lib/api-client";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
} from "@club-os/ui-kit";

interface NavMenuItem {
  id: string;
  label: string;
  linkTarget: string;
  parentId: string | null;
  sortOrder: number;
}

const ADMIN_CAPABILITIES = [
  "membership.manage",
  "reservation.manage",
  "reservation.override",
  "finance.manage",
  "finance.refund",
  "community.moderate",
  "events.manage",
  "events.write",
  "events.publish",
  "settings.read",
  "settings.manage",
  "content.write",
  "content.publish",
  "navigation.write",
  "audit.read",
];

const FALLBACK_NAV: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Content", href: "/admin/content" },
  { label: "Navigation", href: "/admin/navigation" },
  { label: "Branding", href: "/admin/settings/branding" },
  { label: "Reports", href: "/admin/community/reports" },
  { label: "Events", href: "/admin/events" },
];

async function getAdminNav(): Promise<NavMenuItem[]> {
  try {
    const result = await apiFetch<NavMenuItem[]>(
      "/api/admin/navigation/menus/admin_primary",
    );
    if (result.ok && result.data.length > 0) return result.data;
  } catch {
    // API unavailable
  }
  return [];
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!isAuthenticated(session)) {
    redirect("/public");
  }

  const hasAdminAccess = ADMIN_CAPABILITIES.some((capability) =>
    hasCapability(session, capability),
  );
  if (!hasAdminAccess) {
    redirect("/member");
  }

  const menuItems = await getAdminNav();
  const navLinks =
    menuItems.length > 0
      ? menuItems
          .filter((i) => !i.parentId)
          .map((i) => ({ label: i.label, href: i.linkTarget }))
      : FALLBACK_NAV;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: adminTheme.bg,
        color: adminTheme.text,
        fontFamily: fontFamily.sans,
      }}
    >
      {/* Top bar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${spacing.xl}`,
          height: "3.5rem",
          backgroundColor: adminTheme.surface,
          borderBottom: `1px solid ${adminTheme.border}`,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xl }}>
          <a
            href="/admin"
            style={{
              fontFamily: fontFamily.mono,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.sm,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: adminTheme.accent,
              textDecoration: "none",
            }}
          >
            Admin
          </a>
          <div
            style={{
              width: "1px",
              height: "1.25rem",
              backgroundColor: adminTheme.border,
            }}
          />
          <div
            style={{
              display: "flex",
              gap: spacing.xs,
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                  color: adminTheme.textMuted,
                  textDecoration: "none",
                  borderRadius: radii.sm,
                  transition: "background-color 150ms ease, color 150ms ease",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <a
            href="/member"
            style={{
              fontSize: fontSize.xs,
              color: adminTheme.textDim,
              textDecoration: "none",
              padding: `${spacing.xs} ${spacing.sm}`,
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.sm,
              fontWeight: fontWeight.medium,
            }}
          >
            Member View
          </a>
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: fontSize.xs,
              color: adminTheme.textDim,
            }}
          >
            {session.userId}
          </span>
        </div>
      </nav>
      <main style={{ padding: spacing.xl }}>{children}</main>
    </div>
  );
}
