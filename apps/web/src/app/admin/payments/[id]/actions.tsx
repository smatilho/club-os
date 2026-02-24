"use client";

import { useState } from "react";

interface AdminPaymentActionsProps {
  transactionId: string;
  status: string;
}

export function AdminPaymentActions({
  transactionId,
  status,
}: AdminPaymentActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canRefund = status === "succeeded";

  async function handleRefund() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/cms/admin/payments/${transactionId}/refund`,
        { method: "POST" },
      );
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Refund processed." });
      } else {
        setMessage({ type: "error", text: json.error ?? "Refund failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  }

  if (!canRefund && !message) {
    return null;
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "#161616",
        borderRadius: "6px",
        border: "1px solid #2a2a2a",
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
        Actions
      </h2>

      {message && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "4px",
            fontSize: "0.8125rem",
            backgroundColor:
              message.type === "success"
                ? "rgba(80,180,100,0.08)"
                : "rgba(220,60,60,0.08)",
            border: `1px solid ${
              message.type === "success"
                ? "rgba(80,180,100,0.2)"
                : "rgba(220,60,60,0.2)"
            }`,
            color: message.type === "success" ? "#50b464" : "#dc3c3c",
          }}
        >
          {message.text}
        </div>
      )}

      {canRefund && (
        <button
          onClick={handleRefund}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#dc3c3c",
            backgroundColor: "transparent",
            border: "1px solid rgba(220,60,60,0.3)",
            borderRadius: "4px",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Processing..." : "Refund Payment"}
        </button>
      )}
    </div>
  );
}
