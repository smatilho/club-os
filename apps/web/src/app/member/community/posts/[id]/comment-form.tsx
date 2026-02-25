"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Comment cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cms/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to post comment");
        return;
      }
      setBody("");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          padding: "1.25rem",
          backgroundColor: "#fff",
          borderRadius: "10px",
          border: "1px solid #e9ecef",
        }}
      >
        <label
          style={{
            display: "block",
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#4a3d5c",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "0.375rem",
          }}
        >
          Add a Comment
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Join the conversation..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.625rem 0.75rem",
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            border: "1px solid #ddd6e3",
            borderRadius: "6px",
            outline: "none",
            resize: "vertical",
            color: "#2d2235",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "rgba(220,60,60,0.08)",
              border: "1px solid rgba(220,60,60,0.2)",
              borderRadius: "4px",
              color: "#dc3c3c",
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.75rem",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "rgba(80,180,100,0.08)",
              border: "1px solid rgba(80,180,100,0.2)",
              borderRadius: "4px",
              color: "#50b464",
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.75rem",
            }}
          >
            Comment posted
          </div>
        )}

        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.4rem 1.25rem",
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#6d4c9f",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </div>
    </form>
  );
}
