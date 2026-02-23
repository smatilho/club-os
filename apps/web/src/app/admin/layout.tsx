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
    <div>
      <nav>
        <span>Administration</span>
        <span style={{ marginLeft: "auto", fontSize: "0.875rem" }}>
          {session.userId} ({session.roles.join(", ")})
        </span>
      </nav>
      <main>{children}</main>
    </div>
  );
}
