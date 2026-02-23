import { apiFetch } from "../../../lib/api-client";

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
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const isDraft = status === "draft";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "2px",
        backgroundColor: isDraft ? "rgba(200,165,90,0.12)" : "rgba(80,180,100,0.12)",
        color: isDraft ? "#c8a55a" : "#50b464",
        border: `1px solid ${isDraft ? "rgba(200,165,90,0.25)" : "rgba(80,180,100,0.25)"}`,
      }}
    >
      {status}
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

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              margin: 0,
              color: "#e0ddd5",
            }}
          >
            Content Pages
          </h1>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#666",
              margin: "0.25rem 0 0",
            }}
          >
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/content/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#0d0d0d",
            backgroundColor: "#c8a55a",
            border: "none",
            borderRadius: "4px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          + New Page
        </a>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "4px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {pages.length === 0 && !error ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
          }}
        >
          <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
            No content pages yet. Create your first page to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8125rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #2a2a2a",
                }}
              >
                {["Title", "Slug", "Status", "Updated", ""].map(
                  (header) => (
                    <th
                      key={header || "actions"}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontFamily:
                          "'IBM Plex Mono', 'SF Mono', monospace",
                        fontSize: "0.6875rem",
                        fontWeight: 500,
                        color: "#666",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr
                  key={page.id}
                  style={{ borderBottom: "1px solid #1e1e1e" }}
                >
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>
                    {page.title}
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily:
                        "'IBM Plex Mono', 'SF Mono', monospace",
                      fontSize: "0.75rem",
                      color: "#888",
                    }}
                  >
                    /{page.slug}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <StatusBadge status={page.status} />
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      color: "#666",
                      fontSize: "0.75rem",
                    }}
                  >
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </td>
                  <td
                    style={{ padding: "0.75rem 1rem", textAlign: "right" }}
                  >
                    <a
                      href={`/admin/content/${page.id}`}
                      style={{
                        color: "#c8a55a",
                        textDecoration: "none",
                        fontSize: "0.8125rem",
                      }}
                    >
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
