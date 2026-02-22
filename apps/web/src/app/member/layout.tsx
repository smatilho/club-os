import type { ReactNode } from "react";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>
        <span>Member Area</span>
      </nav>
      <main>{children}</main>
    </div>
  );
}
