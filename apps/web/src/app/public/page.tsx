import { publicApiFetch } from "../../lib/api-client";
import { BlockRenderer } from "@club-os/ui-kit";
import type { PageBlock } from "@club-os/domain-core";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  radii,
} from "@club-os/ui-kit";

interface PublicContentPage {
  slug: string;
  title: string;
  body: string;
  publishedAt: string;
  contentFormat?: string;
  blocks?: PageBlock[];
}

export default async function PublicHome() {
  // Resolve homepage: fetch published page with slug "home"
  const result = await publicApiFetch<PublicContentPage>(
    "/api/content/public/pages/home",
  );

  // If homepage exists in CMS, render it
  if (result.ok) {
    const page = result.data;
    if (page.contentFormat === "blocks_v1" && page.blocks && page.blocks.length > 0) {
      return (
        <article>
          <BlockRenderer blocks={page.blocks} />
        </article>
      );
    }

    // Legacy markdown homepage
    return (
      <article>
        <h1>{page.title}</h1>
        <div>{page.body}</div>
      </article>
    );
  }

  // Onboarding fallback: no seeded homepage yet
  return (
    <div
      data-testid="onboarding-fallback"
      style={{
        maxWidth: "600px",
        margin: `${spacing["3xl"]} auto`,
        textAlign: "center",
        fontFamily: fontFamily.sans,
        padding: `0 ${spacing.xl}`,
      }}
    >
      <h1
        style={{
          fontSize: fontSize["3xl"],
          fontWeight: fontWeight.bold,
          margin: `0 0 ${spacing.md}`,
          color: "var(--brand-text, #1a1a1a)",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome to Club OS
      </h1>
      <p
        style={{
          fontSize: fontSize.lg,
          color: "var(--brand-text, #555)",
          margin: `0 0 ${spacing.xl}`,
          lineHeight: "1.6",
        }}
      >
        Your site is ready to set up. Create your homepage and default pages from the admin dashboard.
      </p>
      <a
        href="/admin/content"
        style={{
          display: "inline-block",
          padding: `${spacing.sm} ${spacing.xl}`,
          backgroundColor: "var(--brand-primary, #1a365d)",
          color: "#fff",
          textDecoration: "none",
          borderRadius: radii.md,
          fontWeight: fontWeight.semibold,
          fontSize: fontSize.base,
        }}
      >
        Go to Admin Dashboard
      </a>
    </div>
  );
}
