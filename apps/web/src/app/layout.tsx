import type { ReactNode } from "react";

export const metadata = {
  title: "Club OS",
  description: "Multi-tenant club platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
