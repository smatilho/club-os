import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession, isAuthenticated } from "../../lib/session";
import { apiFetch } from "../../lib/api-client";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  radii,
  shadows,
} from "@club-os/ui-kit";

interface NavMenuItem {
  id: string;
  label: string;
  linkTarget: string;
  parentId: string | null;
  sortOrder: number;
}

const FALLBACK_NAV: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/member" },
  { label: "Reservations", href: "/member/reservations" },
  { label: "Community", href: "/member/community" },
  { label: "Events", href: "/member/events" },
];

async function getMemberNav(): Promise<NavMenuItem[]> {
  try {
    const result = await apiFetch<NavMenuItem[]>(
      "/api/admin/navigation/menus/member_primary",
    );
    if (result.ok && result.data.length > 0) return result.data;
  } catch {
    // API unavailable
  }
  return [];
}

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!isAuthenticated(session)) {
    redirect("/public");
  }

  const menuItems = await getMemberNav();
  const navLinks =
    menuItems.length > 0
      ? menuItems
          .filter((i) => !i.parentId)
          .map((i) => ({ label: i.label, href: i.linkTarget }))
      : FALLBACK_NAV;

  return (
    <div
      style={{
        fontFamily: fontFamily.sans,
        minHeight: "100vh",
        backgroundColor: "#f5f4f0",
      }}
    >
      {/* Header bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${spacing.xl}`,
          height: "4rem",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e5e3de",
          boxShadow: shadows.sm,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xl }}>
          <a
            href="/member"
            style={{
              fontWeight: fontWeight.bold,
              fontSize: fontSize.lg,
              color: "var(--brand-primary, #1a365d)",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            Member Portal
          </a>
          <nav style={{ display: "flex", gap: spacing.xs }}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.medium,
                  color: "#555",
                  textDecoration: "none",
                  borderRadius: radii.md,
                  letterSpacing: "0.01em",
                  transition: "background-color 150ms ease, color 150ms ease",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
          }}
        >
          <span
            style={{
              fontSize: fontSize.sm,
              color: "#999",
              fontWeight: fontWeight.medium,
            }}
          >
            {session.userId}
          </span>
          <a
            href="/public"
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              fontSize: fontSize.xs,
              color: "#999",
              textDecoration: "none",
              borderRadius: radii.sm,
              border: "1px solid #e5e3de",
              fontWeight: fontWeight.medium,
            }}
          >
            Public Site
          </a>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: "1100px",
          marginLeft: "auto",
          marginRight: "auto",
          padding: `${spacing.xl} ${spacing.xl} ${spacing["3xl"]}`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
