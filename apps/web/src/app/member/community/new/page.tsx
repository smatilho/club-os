"use client";

import { useState } from "react";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!body.trim()) {
      setError("Body is required");
      return;
    }

    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/cms/community/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), tags }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create post");
        return;
      }
      setCreatedId(json.data.id);
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  if (createdId) {
    return (
      <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600&display=swap');`}</style>

        <div
          style={{
            padding: "3rem 2rem",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(80,180,100,0.25)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              backgroundColor: "rgba(80,180,100,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "1.5rem",
              color: "#50b464",
            }}
          >
            &#10003;
          </div>
          <h2
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#2d2235",
              marginBottom: "0.5rem",
            }}
          >
            Post Published
          </h2>
          <p
            style={{
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              color: "#7a6e85",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            Your post is live in the community.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <a
              href={`/member/community/posts/${createdId}`}
              style={{
                padding: "0.5rem 1.25rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#6d4c9f",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              View Post
            </a>
            <a
              href="/member/community"
              style={{
                padding: "0.5rem 1rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.8125rem",
                color: "#7a6e85",
                border: "1px solid #ddd6e3",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              Back to Community
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600&display=swap');`}</style>

      <a
        href="/member/community"
        style={{
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
          fontSize: "0.8125rem",
          color: "#6d4c9f",
          textDecoration: "none",
          marginBottom: "1rem",
          display: "inline-block",
        }}
      >
        &larr; Back to Community
      </a>

      <h1
        style={{
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#2d2235",
          marginBottom: "0.375rem",
        }}
      >
        New Post
      </h1>
      <p
        style={{
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
          fontSize: "0.8125rem",
          color: "#7a6e85",
          marginBottom: "2rem",
        }}
      >
        Share something with the community.
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "6px",
            color: "#dc3c3c",
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            fontSize: "0.8125rem",
            marginBottom: "1.5rem",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            borderRadius: "10px",
            border: "1px solid #e9ecef",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#4a3d5c",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              style={{
                padding: "0.625rem 0.75rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.9375rem",
                border: "1px solid #ddd6e3",
                borderRadius: "6px",
                outline: "none",
                color: "#2d2235",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#4a3d5c",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Body
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts, ask a question, or start a discussion..."
              rows={8}
              style={{
                padding: "0.625rem 0.75rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                border: "1px solid #ddd6e3",
                borderRadius: "6px",
                outline: "none",
                resize: "vertical",
                color: "#2d2235",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <span
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#4a3d5c",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Tags
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="fitness, nutrition, general (comma-separated)"
              style={{
                padding: "0.625rem 0.75rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.875rem",
                border: "1px solid #ddd6e3",
                borderRadius: "6px",
                outline: "none",
                color: "#2d2235",
              }}
            />
            <span
              style={{
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.6875rem",
                color: "#a097ab",
              }}
            >
              Separate tags with commas
            </span>
          </label>

          <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.5rem 1.5rem",
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
              {loading ? "Publishing..." : "Publish Post"}
            </button>
            <a
              href="/member/community"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
                fontSize: "0.8125rem",
                color: "#7a6e85",
                border: "1px solid #ddd6e3",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              Cancel
            </a>
          </div>
        </div>
      </form>
    </div>
  );
}
