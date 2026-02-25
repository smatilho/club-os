import { apiFetch } from "../../../../lib/api-client";
import { ReportStatusFilter } from "./status-filter";

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reasonCode: string;
  status: string;
  reportedByUserId: string;
  resolutionNotes: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    open: { bg: "rgba(220,60,60,0.08)", fg: "#dc3c3c", border: "rgba(220,60,60,0.2)" },
    triaged: { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" },
    resolved: { bg: "rgba(80,180,100,0.12)", fg: "#50b464", border: "rgba(80,180,100,0.25)" },
    dismissed: { bg: "rgba(120,120,120,0.1)", fg: "#888", border: "rgba(120,120,120,0.2)" },
  };
  const fallback = { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" };
  const c = colors[status] ?? fallback;
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
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {status}
    </span>
  );
}

export default async function AdminReportsPage() {
  let reports: Report[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<Report[]>("/api/admin/community/reports");
    if (result.ok) {
      reports = result.data;
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, color: "#e0ddd5" }}>
            Community Reports
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#666", margin: "0.25rem 0 0" }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </p>
        </div>
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

      {reports.length === 0 && !error ? (
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
            No reports.
          </p>
        </div>
      ) : (
        <>
          <ReportStatusFilter />
          <div
            id="reports-table"
            style={{
              backgroundColor: "#161616",
              borderRadius: "6px",
              border: "1px solid #2a2a2a",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["Target", "Reason", "Status", "Reporter", "Created", ""].map(
                    (header) => (
                      <th
                        key={header || "actions"}
                        style={{
                          textAlign: "left",
                          padding: "0.75rem 1rem",
                          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
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
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    data-status={report.status}
                    style={{ borderBottom: "1px solid #1e1e1e" }}
                  >
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                          fontSize: "0.6875rem",
                          color: "#888",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {report.targetType}
                      </span>
                      <span style={{ color: "#444", margin: "0 0.375rem" }}>/</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                          fontSize: "0.75rem",
                          color: "#aaa",
                        }}
                      >
                        {report.targetId.slice(0, 8)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                        fontSize: "0.75rem",
                        color: "#aaa",
                      }}
                    >
                      {report.reasonCode.replace(/_/g, " ")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <StatusBadge status={report.status} />
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 1rem",
                        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                        fontSize: "0.75rem",
                        color: "#888",
                      }}
                    >
                      {report.reportedByUserId.slice(0, 8)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#666", fontSize: "0.75rem" }}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <a
                        href={`/admin/community/reports/${report.id}`}
                        style={{ color: "#c8a55a", textDecoration: "none", fontSize: "0.8125rem" }}
                      >
                        Review
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
