"use client";

import { useState } from "react";

interface AdminReservationActionsProps {
  reservationId: string;
  status: string;
  paymentTransactionId: string | null;
}

export function AdminReservationActions({
  reservationId,
  status,
  paymentTransactionId,
}: AdminReservationActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");

  const canOverrideConfirm =
    status === "payment_pending" || status === "payment_failed";
  const canCancel = status !== "canceled";
  const canRefund =
    paymentTransactionId && (status === "confirmed" || status === "payment_pending");

  async function handleOverrideConfirm() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/cms/admin/reservations/${reservationId}/override-confirm`,
        { method: "POST" },
      );
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Reservation confirmed via override." });
      } else {
        setMessage({ type: "error", text: json.error ?? "Override failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!reason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for cancellation." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/cms/reservations/${reservationId}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Reservation canceled." });
      } else {
        setMessage({ type: "error", text: json.error ?? "Cancel failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund() {
    if (!paymentTransactionId) return;
    if (!reason.trim()) {
      setMessage({ type: "error", text: "Please provide a reason for refund." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/cms/admin/payments/${paymentTransactionId}/refund`,
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

      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="action-reason"
          style={{
            display: "block",
            fontSize: "0.75rem",
            color: "#666",
            marginBottom: "0.25rem",
          }}
        >
          Reason (required for cancel/refund)
        </label>
        <input
          id="action-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason..."
          style={{
            width: "100%",
            padding: "0.5rem",
            backgroundColor: "#0d0d0d",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            color: "#e0ddd5",
            fontSize: "0.8125rem",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {canOverrideConfirm && (
          <button
            onClick={handleOverrideConfirm}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#0d0d0d",
              backgroundColor: "#c8a55a",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Override Confirm
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
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
            Cancel Reservation
          </button>
        )}
        {canRefund && (
          <button
            onClick={handleRefund}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#e0ddd5",
              backgroundColor: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: "4px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            Refund Payment
          </button>
        )}
      </div>
    </div>
  );
}
