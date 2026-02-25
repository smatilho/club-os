import { apiFetch } from "../../../../../lib/api-client";
import { notFound } from "next/navigation";
import { ReportActions } from "./actions";

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

interface PostPreview {
  id: string;
  title?: string;
  body?: string;
  authorUserId?: string;
  status?: string;
}

interface CommentPreview {
  id: string;
  body?: string;
  authorUserId?: string;
  status?: string;
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
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        fontWeight: 600,
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

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<Report>(`/api/admin/community/reports/${id}`);

  if (!result.ok) {
    notFound();
  }

  const report = result.data;

  // Attempt to load a preview of the target content
  let targetPreview: PostPreview | CommentPreview | null = null;
  if (report.targetType === "post") {
    const previewResult = await apiFetch<PostPreview>(
      `/api/admin/community/posts/${report.targetId}`,
    );
    if (previewResult.ok) targetPreview = previewResult.data;
  } else if (report.targetType === "comment") {
    const previewResult = await apiFetch<CommentPreview>(
      `/api/admin/community/comments/${report.targetId}`,
    );
    if (previewResult.ok) targetPreview = previewResult.data;
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <a
        href="/admin/community/reports"
        style={{ fontSize: "0.8125rem", color: "#c8a55a", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}
      >
        &larr; Back to Reports
      </a>

      {/* Report details */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#161616",
          borderRadius: "6px",
          border: "1px solid #2a2a2a",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, color: "#e0ddd5" }}>
            Report Detail
          </h1>
          <StatusBadge status={report.status} />
        </div>

        <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.8125rem" }}>
          <Row label="Report ID" value={report.id} mono />
          <Row label="Target Type" value={report.targetType} />
          <Row label="Target ID" value={report.targetId} mono />
          <Row label="Reason" value={report.reasonCode.replace(/_/g, " ")} />
          <Row label="Reported By" value={report.reportedByUserId} mono />
          <Row label="Created" value={new Date(report.createdAt).toLocaleString()} />
          {report.resolvedByUserId && (
            <Row label="Resolved By" value={report.resolvedByUserId} mono />
          )}
          {report.resolutionNotes && (
            <Row label="Resolution Notes" value={report.resolutionNotes} />
          )}
        </div>
      </div>

      {/* Target preview */}
      {targetPreview && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#e0ddd5",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
            }}
          >
            Target Preview
          </h2>

          {"title" in targetPreview && targetPreview.title && (
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{ color: "#666", fontSize: "0.75rem" }}>Title: </span>
              <span style={{ color: "#e0ddd5", fontWeight: 500 }}>{targetPreview.title}</span>
            </div>
          )}
          {"body" in targetPreview && targetPreview.body && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#0d0d0d",
                borderRadius: "4px",
                border: "1px solid #2a2a2a",
                fontSize: "0.8125rem",
                color: "#aaa",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                maxHeight: "12rem",
                overflow: "auto",
              }}
            >
              {targetPreview.body}
            </div>
          )}
          {"authorUserId" in targetPreview && targetPreview.authorUserId && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#666" }}>
              Author: <span style={{ fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", color: "#888" }}>{targetPreview.authorUserId.slice(0, 8)}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <ReportActions
        reportId={report.id}
        status={report.status}
        targetType={report.targetType}
        targetId={report.targetId}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          color: "#e0ddd5",
          fontWeight: 500,
          ...(mono ? { fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", fontSize: "0.75rem" } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}
