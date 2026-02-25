"use client";

import { useState } from "react";

interface MarkReadButtonProps {
  notificationId: string;
}

export function MarkReadButton({ notificationId }: MarkReadButtonProps) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkRead() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to mark as read");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span
        style={{
          fontSize: "0.6875rem",
          color: "#50b464",
          fontWeight: 500,
        }}
      >
        &#10003; Read
      </span>
    );
  }

  return (
    <span>
      {error && (
        <span
          style={{
            fontSize: "0.625rem",
            color: "#dc3c3c",
            marginRight: "0.5rem",
          }}
        >
          {error}
        </span>
      )}
      <button
        onClick={handleMarkRead}
        disabled={loading}
        style={{
          padding: "0.2rem 0.5rem",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "#648cdc",
          backgroundColor: "rgba(100,140,220,0.08)",
          border: "1px solid rgba(100,140,220,0.2)",
          borderRadius: "4px",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "..." : "Mark as read"}
      </button>
    </span>
  );
}
