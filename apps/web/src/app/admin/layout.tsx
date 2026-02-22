import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav>
        <span>Administration</span>
      </nav>
      <main>{children}</main>
    </div>
  );
}
