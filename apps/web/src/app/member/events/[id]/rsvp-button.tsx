"use client";

import { useState } from "react";

interface RsvpButtonProps {
  eventId: string;
  currentStatus: string | null;
}

export function RsvpButton({ eventId, currentStatus }: RsvpButtonProps) {
  const [status, setStatus] = useState<string | null>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGoing = status === "going";
  const isWaitlist = status === "waitlist";
  const hasRsvp = isGoing || isWaitlist;

  async function handleRsvp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to RSVP");
        return;
      }
      setStatus(json.data.status);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/events/${eventId}/rsvp/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to cancel RSVP");
        return;
      }
      setStatus("canceled");
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  const feedbackColors: Record<string, { bg: string; fg: string; border: string }> = {
    going: {
      bg: "rgba(80,180,100,0.1)",
      fg: "#3d8a4e",
      border: "rgba(80,180,100,0.25)",
    },
    waitlist: {
      bg: "rgba(200,165,90,0.1)",
      fg: "#9a7b30",
      border: "rgba(200,165,90,0.25)",
    },
    canceled: {
      bg: "rgba(120,120,120,0.08)",
      fg: "#888",
      border: "rgba(120,120,120,0.2)",
    },
  };
  const feedbackFallback = { bg: "rgba(100,140,220,0.1)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" };

  const feedbackMessages: Record<string, string> = {
    going: "You\u2019re going! See you there.",
    waitlist: "You\u2019re on the waitlist. We\u2019ll let you know if a spot opens up.",
    canceled: "Your RSVP has been canceled.",
  };

  return (
    <div>
      {/* Feedback message */}
      {status && feedbackMessages[status] && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 500,
            marginBottom: "1rem",
            backgroundColor: (feedbackColors[status] ?? feedbackFallback).bg,
            color: (feedbackColors[status] ?? feedbackFallback).fg,
            border: `1px solid ${(feedbackColors[status] ?? feedbackFallback).border}`,
          }}
        >
          {feedbackMessages[status]}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "6px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {!hasRsvp ? (
          <button
            onClick={handleRsvp}
            disabled={loading}
            style={{
              padding: "0.625rem 1.75rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: "#e06850",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.02em",
            }}
          >
            {loading ? "Sending..." : status === "canceled" ? "RSVP Again" : "RSVP to This Event"}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#c44",
              backgroundColor: "transparent",
              border: "1px solid rgba(220,60,60,0.25)",
              borderRadius: "8px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Canceling..." : "Cancel RSVP"}
          </button>
        )}
      </div>
    </div>
  );
}
