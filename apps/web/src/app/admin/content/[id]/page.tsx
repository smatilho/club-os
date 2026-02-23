"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface ContentPageDetail {
  id: string;
  organizationId: string;
  status: "draft" | "published";
  draft: { title: string; slug: string; body: string; updatedAt: string };
  published: {
    title: string;
    slug: string;
    body: string;
    publishedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

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

export default function EditContentPage() {
  const params = useParams<{ id: string }>();
  const pageId = params.id;
  const [page, setPage] = useState<ContentPageDetail | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/content/pages/${pageId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load page");
        setLoading(false);
        return;
      }
      const data = json.data as ContentPageDetail;
      setPage(data);
      setTitle(data.draft.title);
      setSlug(data.draft.slug);
      setBody(data.draft.body);
      setLoading(false);
    } catch {
      setError("Unable to connect to API");
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/cms/content/pages/${pageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug, body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setPage(json.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError("Unable to connect to API");
    }
    setSaving(false);
  }

  async function handlePublish() {
    setError(null);
    setPublishing(true);
    setPublishSuccess(false);

    try {
      const res = await fetch(`/api/cms/content/pages/${pageId}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to publish");
        setPublishing(false);
        return;
      }
      setPage(json.data);
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    } catch {
      setError("Unable to connect to API");
    }
    setPublishing(false);
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: "48rem",
          margin: "0 auto",
          color: "#666",
          padding: "3rem",
          textAlign: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "4px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
          }}
        >
          {error ?? "Page not found"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
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
        <span style={{ color: "#888", fontSize: "0.8125rem" }}>
          {page.draft.title}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Edit Page
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.125rem 0.5rem",
              fontSize: "0.6875rem",
              fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderRadius: "2px",
              backgroundColor:
                page.status === "draft"
                  ? "rgba(200,165,90,0.12)"
                  : "rgba(80,180,100,0.12)",
              color: page.status === "draft" ? "#c8a55a" : "#50b464",
              border: `1px solid ${page.status === "draft" ? "rgba(200,165,90,0.25)" : "rgba(80,180,100,0.25)"}`,
            }}
          >
            {page.status}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
              color: "#555",
            }}
          >
            v{page.version}
          </span>
        </div>
      </div>

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

      {publishSuccess && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(80,180,100,0.08)",
            border: "1px solid rgba(80,180,100,0.2)",
            borderRadius: "4px",
            color: "#50b464",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          Page published successfully. View at{" "}
          <a
            href={`/public/${page.published?.slug ?? slug}`}
            style={{ color: "#50b464" }}
          >
            /public/{page.published?.slug ?? slug}
          </a>
        </div>
      )}

      {/* Published metadata */}
      {page.published && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
            marginBottom: "1.25rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ ...labelStyle, marginBottom: "0.25rem" }}>
              Published Slug
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                fontSize: "0.8125rem",
                color: "#aaa",
              }}
            >
              /public/{page.published.slug}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: "0.25rem" }}>
              Published At
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#aaa" }}>
              {new Date(page.published.publishedAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: "0.25rem" }}>
              Published Title
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#aaa" }}>
              {page.published.title}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave}>
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
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="slug" style={labelStyle}>
              Slug
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
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
              rows={14}
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
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: publishing ? "#555" : "#50b464",
              backgroundColor: "transparent",
              border: `1px solid ${publishing ? "#333" : "rgba(80,180,100,0.3)"}`,
              borderRadius: "4px",
              cursor: publishing ? "not-allowed" : "pointer",
            }}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            {saveSuccess && (
              <span style={{ color: "#50b464", fontSize: "0.8125rem" }}>
                Saved
              </span>
            )}
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
              Back
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
              {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
