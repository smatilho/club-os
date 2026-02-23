"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  backgroundColor: "#1e1e1e",
  border: "1px solid #333",
  borderRadius: "4px",
  color: "#e0ddd5",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
  fontWeight: 500,
  color: "#888",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "0.375rem",
};

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/cms/content/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug, body }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create page");
        setSaving(false);
        return;
      }

      router.push(`/admin/content/${json.data.id}`);
    } catch {
      setError("Unable to connect to API");
      setSaving(false);
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slug || slug === toSlug(title)) {
      setSlug(toSlug(value));
    }
  }

  function toSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <a
          href="/admin/content"
          style={{
            color: "#666",
            textDecoration: "none",
            fontSize: "0.8125rem",
          }}
        >
          Content Pages
        </a>
        <span style={{ color: "#444", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#888", fontSize: "0.8125rem" }}>New</span>
      </div>

      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: "0 0 1.5rem",
          color: "#e0ddd5",
        }}
      >
        Create Page
      </h1>

      {error && (
        <div
          role="alert"
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

      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div>
            <label htmlFor="title" style={labelStyle}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Page title"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="slug" style={labelStyle}>
              Slug
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  color: "#555",
                  fontSize: "0.875rem",
                  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                }}
              >
                /public/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="page-slug"
                required
                style={{
                  ...inputStyle,
                  fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                  fontSize: "0.8125rem",
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="body" style={labelStyle}>
              Content
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Page content (markdown supported)"
              rows={12}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1.25rem",
          }}
        >
          <a
            href="/admin/content"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              color: "#888",
              textDecoration: "none",
              border: "1px solid #333",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#0d0d0d",
              backgroundColor: saving ? "#8a7340" : "#c8a55a",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Creating..." : "Create Page"}
          </button>
        </div>
      </form>
    </div>
  );
}
