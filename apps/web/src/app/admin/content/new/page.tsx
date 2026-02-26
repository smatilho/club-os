"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
  PAGE_TEMPLATES,
} from "@club-os/ui-kit";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.sm}`,
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  backgroundColor: adminTheme.bg,
  border: `1px solid ${adminTheme.border}`,
  borderRadius: radii.sm,
  color: adminTheme.text,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: fontSize.xs,
  fontFamily: fontFamily.mono,
  fontWeight: fontWeight.medium,
  color: adminTheme.textMuted,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: spacing.xs,
};

type CreateMode = "template" | "blank";

export default function NewContentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
      const payload: Record<string, unknown> = { title, slug, body };
      if (mode === "template" && selectedTemplate) {
        payload.templateKey = selectedTemplate;
        payload.contentFormat = "blocks_v1";
      }

      const res = await fetch("/api/cms/content/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

  // Step 1: Choose mode
  if (mode === null) {
    return (
      <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <div style={{ marginBottom: spacing.xl }}>
          <a
            href="/admin/content"
            style={{ color: adminTheme.textDim, textDecoration: "none", fontSize: fontSize.sm }}
          >
            Content Pages
          </a>
          <span style={{ color: adminTheme.textDim, margin: `0 ${spacing.sm}` }}>/</span>
          <span style={{ color: adminTheme.textMuted, fontSize: fontSize.sm }}>New</span>
        </div>

        <h1 style={{ fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, margin: `0 0 ${spacing.lg}`, color: adminTheme.text }}>
          Create Page
        </h1>

        <p style={{ color: adminTheme.textMuted, fontSize: fontSize.base, marginBottom: spacing.xl }}>
          Choose how to start your new page.
        </p>

        <div style={{ display: "flex", gap: spacing.md }}>
          <button
            onClick={() => setMode("template")}
            style={{
              flex: 1,
              padding: spacing.lg,
              backgroundColor: adminTheme.surface,
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.md,
              color: adminTheme.text,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: fontFamily.sans,
            }}
          >
            <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.md, marginBottom: spacing.xs }}>
              Start from Template
            </div>
            <div style={{ fontSize: fontSize.sm, color: adminTheme.textMuted }}>
              Choose a pre-built layout with blocks
            </div>
          </button>
          <button
            onClick={() => setMode("blank")}
            style={{
              flex: 1,
              padding: spacing.lg,
              backgroundColor: adminTheme.surface,
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.md,
              color: adminTheme.text,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: fontFamily.sans,
            }}
          >
            <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.md, marginBottom: spacing.xs }}>
              Blank Markdown
            </div>
            <div style={{ fontSize: fontSize.sm, color: adminTheme.textMuted }}>
              Start with a simple text editor
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Step 2 (template): Choose template
  if (mode === "template" && !selectedTemplate) {
    return (
      <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
        <div style={{ marginBottom: spacing.xl }}>
          <button
            onClick={() => setMode(null)}
            style={{
              background: "none",
              border: "none",
              color: adminTheme.textDim,
              cursor: "pointer",
              fontSize: fontSize.sm,
              fontFamily: fontFamily.sans,
              padding: 0,
            }}
          >
            Back
          </button>
        </div>

        <h1 style={{ fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, margin: `0 0 ${spacing.lg}`, color: adminTheme.text }}>
          Choose a Template
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
          {PAGE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              onClick={() => {
                setSelectedTemplate(tpl.key);
                if (!title) {
                  setTitle(tpl.name.replace(" Page", ""));
                  setSlug(toSlug(tpl.name.replace(" Page", "")));
                }
              }}
              style={{
                padding: spacing.md,
                backgroundColor: adminTheme.surface,
                border: `1px solid ${adminTheme.border}`,
                borderRadius: radii.sm,
                color: adminTheme.text,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: fontFamily.sans,
              }}
            >
              <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.base }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: fontSize.sm, color: adminTheme.textMuted, marginTop: spacing.xs }}>
                {tpl.description} ({tpl.blocks.length} blocks)
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: Title/slug form + create
  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
      <div style={{ marginBottom: spacing.xl }}>
        <a
          href="/admin/content"
          style={{ color: adminTheme.textDim, textDecoration: "none", fontSize: fontSize.sm }}
        >
          Content Pages
        </a>
        <span style={{ color: adminTheme.textDim, margin: `0 ${spacing.sm}` }}>/</span>
        <span style={{ color: adminTheme.textMuted, fontSize: fontSize.sm }}>New</span>
      </div>

      <h1 style={{ fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, margin: `0 0 ${spacing.lg}`, color: adminTheme.text }}>
        Create Page
      </h1>

      {selectedTemplate && (
        <div style={{ marginBottom: spacing.md, fontSize: fontSize.sm, color: adminTheme.textMuted }}>
          Template: {PAGE_TEMPLATES.find((t) => t.key === selectedTemplate)?.name}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: radii.sm,
            color: adminTheme.error,
            fontSize: fontSize.sm,
            marginBottom: spacing.md,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: adminTheme.surface,
            borderRadius: radii.md,
            border: `1px solid ${adminTheme.border}`,
            padding: spacing.lg,
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          <div>
            <label htmlFor="title" style={labelStyle}>Title</label>
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
            <label htmlFor="slug" style={labelStyle}>Slug</label>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <span style={{ color: adminTheme.textDim, fontSize: fontSize.base, fontFamily: fontFamily.mono }}>
                /public/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="page-slug"
                required
                style={{ ...inputStyle, fontFamily: fontFamily.mono, fontSize: fontSize.sm }}
              />
            </div>
          </div>

          {mode === "blank" && (
            <div>
              <label htmlFor="body" style={labelStyle}>Content</label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Page content (markdown supported)"
                rows={12}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md }}>
          <a
            href="/admin/content"
            style={{
              padding: `${spacing.xs} ${spacing.md}`,
              fontSize: fontSize.sm,
              color: adminTheme.textMuted,
              textDecoration: "none",
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.sm,
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
              padding: `${spacing.xs} ${spacing.md}`,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: adminTheme.bg,
              backgroundColor: saving ? "#8a7340" : adminTheme.accent,
              border: "none",
              borderRadius: radii.sm,
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
