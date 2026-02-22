import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <nav>
          <span>Club OS</span>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
