"use client";

import { useState } from "react";

interface ReportActionsProps {
  reportId: string;
  status: string;
  targetType: string;
  targetId: string;
}

export function ReportActions({ reportId, status, targetType, targetId }: ReportActionsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notes, setNotes] = useState("");

  const canTriage = status === "open";
  const canResolve = status === "open" || status === "triaged";
  const canDismiss = status === "open" || status === "triaged";
  const isTargetPost = targetType === "post";
  const isTargetComment = targetType === "comment";

  async function performAction(url: string, body?: Record<string, unknown>) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: json.message ?? "Action completed." });
      } else {
        setMessage({ type: "error", text: json.error ?? "Action failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Connection error" });
    } finally {
      setLoading(false);
    }
  }

  function handleTriage() {
    performAction(
      `/api/cms/admin/community/reports/${reportId}/triage`,
      notes.trim() ? { notes: notes.trim() } : undefined,
    );
  }

  function handleResolve() {
    performAction(
      `/api/cms/admin/community/reports/${reportId}/resolve`,
      { notes: notes.trim() || undefined },
    );
  }

  function handleDismiss() {
    performAction(
      `/api/cms/admin/community/reports/${reportId}/dismiss`,
      notes.trim() ? { notes: notes.trim() } : undefined,
    );
  }

  function handleHide() {
    const base = isTargetPost ? "posts" : "comments";
    performAction(`/api/cms/admin/community/${base}/${targetId}/hide`);
  }

  function handleUnhide() {
    const base = isTargetPost ? "posts" : "comments";
    performAction(`/api/cms/admin/community/${base}/${targetId}/unhide`);
  }

  function handleLock() {
    if (!isTargetPost) return;
    performAction(`/api/cms/admin/community/posts/${targetId}/lock`);
  }

  function handleUnlock() {
    if (!isTargetPost) return;
    performAction(`/api/cms/admin/community/posts/${targetId}/unlock`);
  }

  const actionBtnBase: React.CSSProperties = {
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    borderRadius: "4px",
    cursor: loading ? "wait" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  return (
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
        Report Actions
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
          htmlFor="report-notes"
          style={{
            display: "block",
            fontSize: "0.75rem",
            color: "#666",
            marginBottom: "0.25rem",
          }}
        >
          Notes
        </label>
        <textarea
          id="report-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for triage/resolve/dismiss..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            backgroundColor: "#0d0d0d",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            color: "#e0ddd5",
            fontSize: "0.8125rem",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Triage / Resolve / Dismiss */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {canTriage && (
          <button
            onClick={handleTriage}
            disabled={loading}
            style={{
              ...actionBtnBase,
              color: "#0d0d0d",
              backgroundColor: "#c8a55a",
              border: "none",
            }}
          >
            Triage
          </button>
        )}
        {canResolve && (
          <button
            onClick={handleResolve}
            disabled={loading}
            style={{
              ...actionBtnBase,
              color: "#50b464",
              backgroundColor: "transparent",
              border: "1px solid rgba(80,180,100,0.3)",
            }}
          >
            Resolve
          </button>
        )}
        {canDismiss && (
          <button
            onClick={handleDismiss}
            disabled={loading}
            style={{
              ...actionBtnBase,
              color: "#888",
              backgroundColor: "transparent",
              border: "1px solid #2a2a2a",
            }}
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Moderation actions on target content */}
      {(isTargetPost || isTargetComment) && (
        <>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#888",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
              borderTop: "1px solid #2a2a2a",
              paddingTop: "1rem",
            }}
          >
            Moderate {targetType}
          </h3>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={handleHide}
              disabled={loading}
              style={{
                ...actionBtnBase,
                color: "#dc3c3c",
                backgroundColor: "transparent",
                border: "1px solid rgba(220,60,60,0.3)",
              }}
            >
              Hide
            </button>
            <button
              onClick={handleUnhide}
              disabled={loading}
              style={{
                ...actionBtnBase,
                color: "#50b464",
                backgroundColor: "transparent",
                border: "1px solid rgba(80,180,100,0.3)",
              }}
            >
              Unhide
            </button>
            {isTargetPost && (
              <>
                <button
                  onClick={handleLock}
                  disabled={loading}
                  style={{
                    ...actionBtnBase,
                    color: "#c8a55a",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(200,165,90,0.3)",
                  }}
                >
                  Lock
                </button>
                <button
                  onClick={handleUnlock}
                  disabled={loading}
                  style={{
                    ...actionBtnBase,
                    color: "#e0ddd5",
                    backgroundColor: "transparent",
                    border: "1px solid #2a2a2a",
                  }}
                >
                  Unlock
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
