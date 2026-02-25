import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession, hasCapability, isAuthenticated } from "../../lib/session";

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
  "audit.read",
];

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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0d0d0d",
        color: "#e0ddd5",
        fontFamily:
          "'IBM Plex Sans', 'SF Pro Text', -apple-system, sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
          height: "3.5rem",
          backgroundColor: "#161616",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
              fontWeight: 600,
              fontSize: "0.8125rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#c8a55a",
            }}
          >
            Administration
          </span>
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
            }}
          >
            <a
              href="/admin"
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.8125rem",
                color: "#999",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Dashboard
            </a>
            <a
              href="/admin/content"
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.8125rem",
                color: "#999",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Content
            </a>
            <a
              href="/admin/settings/branding"
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.8125rem",
                color: "#999",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Branding
            </a>
            <a
              href="/admin/community/reports"
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.8125rem",
                color: "#999",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Reports
            </a>
            <a
              href="/admin/events"
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.8125rem",
                color: "#999",
                textDecoration: "none",
                borderRadius: "4px",
              }}
            >
              Events
            </a>
          </div>
        </div>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
            fontSize: "0.75rem",
            color: "#666",
          }}
        >
          {session.userId} / {session.roles.join(", ")}
        </span>
      </nav>
      <main style={{ padding: "2rem" }}>{children}</main>
    </div>
  );
}
