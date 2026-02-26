import { apiFetch } from "../../../lib/api-client";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
} from "@club-os/ui-kit";

interface ContentPageSummary {
  id: string;
  organizationId: string;
  status: "draft" | "published";
  slug: string;
  title: string;
  publishedSlug: string | null;
  publishedAt: string | null;
  updatedAt: string;
  version: number;
  showInMenu?: boolean;
  menuLocation?: string | null;
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const isDraft = status === "draft";
  return (
    <span
      style={{
        display: "inline-block",
        padding: `2px ${spacing.sm}`,
        fontSize: fontSize.xs,
        fontFamily: fontFamily.mono,
        fontWeight: fontWeight.medium,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: radii.sm,
        backgroundColor: isDraft ? "rgba(200,165,90,0.12)" : "rgba(80,180,100,0.12)",
        color: isDraft ? adminTheme.accent : adminTheme.success,
        border: `1px solid ${isDraft ? "rgba(200,165,90,0.25)" : "rgba(80,180,100,0.25)"}`,
      }}
    >
      {status}
    </span>
  );
}

function MenuBadge({ showInMenu, location }: { showInMenu?: boolean; location?: string | null }) {
  if (!showInMenu) return <span style={{ color: adminTheme.textDim, fontSize: fontSize.xs }}>—</span>;
  const label = location?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Yes";
  return (
    <span
      style={{
        display: "inline-block",
        padding: `2px ${spacing.sm}`,
        fontSize: fontSize.xs,
        fontFamily: fontFamily.mono,
        fontWeight: fontWeight.medium,
        letterSpacing: "0.04em",
        borderRadius: radii.sm,
        backgroundColor: "rgba(100,160,220,0.12)",
        color: "#64a0dc",
        border: "1px solid rgba(100,160,220,0.25)",
      }}
    >
      {label}
    </span>
  );
}

export default async function ContentListPage() {
  let pages: ContentPageSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ContentPageSummary[]>(
      "/api/content/pages",
    );
    if (result.ok) {
      pages = result.data;
    } else {
      error = result.error;
    }
  } catch {
    error = "Unable to connect to API";
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: `${spacing.sm} ${spacing.md}`,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: adminTheme.textDim,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  const tdStyle: React.CSSProperties = {
    padding: `${spacing.sm} ${spacing.md}`,
  };

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: spacing["2xl"] }}>
        <div>
          <h1 style={{ fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, margin: 0, color: adminTheme.text }}>
            Content Pages
          </h1>
          <p style={{ fontSize: fontSize.sm, color: adminTheme.textDim, margin: `${spacing.xs} 0 0` }}>
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/content/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing.xs,
            padding: `${spacing.xs} ${spacing.md}`,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: adminTheme.bg,
            backgroundColor: adminTheme.accent,
            border: "none",
            borderRadius: radii.sm,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          + New Page
        </a>
      </div>

      {error && (
        <div style={{
          padding: `${spacing.sm} ${spacing.md}`,
          backgroundColor: "rgba(220,60,60,0.08)",
          border: "1px solid rgba(220,60,60,0.2)",
          borderRadius: radii.sm,
          color: adminTheme.error,
          fontSize: fontSize.sm,
          marginBottom: spacing.md,
        }}>
          {error}
        </div>
      )}

      {pages.length === 0 && !error ? (
        <div style={{
          padding: spacing["2xl"],
          textAlign: "center",
          backgroundColor: adminTheme.surface,
          borderRadius: radii.md,
          border: `1px solid ${adminTheme.border}`,
        }}>
          <p style={{ color: adminTheme.textDim, fontSize: fontSize.base, margin: 0 }}>
            No content pages yet. Create your first page to get started.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: adminTheme.surface,
          borderRadius: radii.md,
          border: `1px solid ${adminTheme.border}`,
          overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fontSize.sm }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${adminTheme.border}` }}>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Menu</th>
                <th style={thStyle}>Updated</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <td style={{ ...tdStyle, fontWeight: fontWeight.medium }}>{page.title}</td>
                  <td style={{ ...tdStyle, fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: adminTheme.textMuted }}>
                    /{page.slug}
                  </td>
                  <td style={tdStyle}><StatusBadge status={page.status} /></td>
                  <td style={tdStyle}><MenuBadge showInMenu={page.showInMenu} location={page.menuLocation} /></td>
                  <td style={{ ...tdStyle, color: adminTheme.textDim, fontSize: fontSize.xs }}>
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <a href={`/admin/content/${page.id}`} style={{ color: adminTheme.accent, textDecoration: "none", fontSize: fontSize.sm }}>
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
