"use client";

import { useState } from "react";

interface ReportButtonProps {
  type: "post" | "comment";
  targetId: string;
  postId: string;
}

export default function ReportButton({ type, targetId, postId }: ReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReport() {
    if (reported) return;
    if (!confirm(`Report this ${type}? A moderator will review it.`)) return;

    setLoading(true);
    setError(null);

    const url =
      type === "post"
        ? `/api/cms/community/posts/${postId}/report`
        : `/api/cms/community/posts/${postId}/comments/${targetId}/report`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "flagged by member" }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to report");
        return;
      }
      setReported(true);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  if (reported) {
    return (
      <span
        style={{
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
          fontSize: "0.6875rem",
          color: "#c8a55a",
          fontWeight: 500,
        }}
      >
        Reported
      </span>
    );
  }

  return (
    <span>
      <button
        onClick={handleReport}
        disabled={loading}
        style={{
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
          fontSize: "0.6875rem",
          color: "#a097ab",
          backgroundColor: "transparent",
          border: "none",
          cursor: loading ? "wait" : "pointer",
          padding: "0.125rem 0.375rem",
          borderRadius: "3px",
          textDecoration: "underline",
          textDecorationStyle: "dotted" as const,
          textUnderlineOffset: "2px",
        }}
      >
        {loading ? "Reporting..." : "Report"}
      </button>
      {error && (
        <span
          style={{
            marginLeft: "0.375rem",
            fontSize: "0.625rem",
            color: "#dc3c3c",
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}
