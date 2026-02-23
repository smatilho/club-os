import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession, isAuthenticated } from "../../lib/session";

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!isAuthenticated(session)) {
    redirect("/public");
  }

  return (
    <div>
      <nav>
        <span>Member Area</span>
        <span style={{ marginLeft: "auto", fontSize: "0.875rem" }}>
          {session.userId}
        </span>
      </nav>
      <main>{children}</main>
    </div>
  );
}
