"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
} from "@club-os/ui-kit";
import type { PageBlock } from "@club-os/domain-core";
import BlockEditorPanel from "./block-editor";

interface ContentPageDetail {
  id: string;
  organizationId: string;
  status: "draft" | "published";
  draft: {
    title: string;
    slug: string;
    body: string;
    updatedAt: string;
    showInMenu?: boolean;
    menuLocation?: string | null;
    menuLabel?: string | null;
    menuSortOrder?: number | null;
    contentFormat?: string;
    blocks?: PageBlock[];
  };
  published: {
    title: string;
    slug: string;
    body: string;
    publishedAt: string;
    contentFormat?: string;
    blocks?: PageBlock[];
  } | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.md}`,
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  backgroundColor: adminTheme.bg,
  border: `1px solid ${adminTheme.border}`,
  borderRadius: radii.md,
  color: adminTheme.text,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms ease",
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

function SectionCard({ title, children, style }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: adminTheme.surface,
        borderRadius: radii.md,
        border: `1px solid ${adminTheme.border}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            borderBottom: `1px solid ${adminTheme.border}`,
            backgroundColor: adminTheme.surfaceRaised,
          }}
        >
          <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: adminTheme.text }}>
            {title}
          </span>
        </div>
      )}
      <div style={{ padding: spacing.lg, display: "flex", flexDirection: "column", gap: spacing.md }}>
        {children}
      </div>
    </div>
  );
}

export default function EditContentPage() {
  const params = useParams<{ id: string }>();
  const pageId = params.id;
  const [page, setPage] = useState<ContentPageDetail | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [showInMenu, setShowInMenu] = useState(false);
  const [menuLocation, setMenuLocation] = useState("");
  const [menuLabel, setMenuLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const isBlockMode = page?.draft.contentFormat === "blocks_v1";

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
      setBlocks(data.draft.blocks ?? []);
      setShowInMenu(data.draft.showInMenu ?? false);
      setMenuLocation(data.draft.menuLocation ?? "");
      setMenuLabel(data.draft.menuLabel ?? "");
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
      const payload: Record<string, unknown> = { title, slug, showInMenu, menuLocation: menuLocation || undefined, menuLabel: menuLabel || undefined };
      if (isBlockMode) {
        payload.blocks = blocks;
        payload.contentFormat = "blocks_v1";
      } else {
        payload.body = body;
      }

      const res = await fetch(`/api/cms/content/pages/${pageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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
      <div style={{ maxWidth: "52rem", margin: "0 auto", color: adminTheme.textDim, padding: spacing["2xl"], textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        <div
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: radii.md,
            color: adminTheme.error,
            fontSize: fontSize.sm,
          }}
        >
          {error ?? "Page not found"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "52rem", margin: "0 auto", paddingBottom: spacing["4xl"] }}>
      {/* Breadcrumb + status header */}
      <div style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
          <a href="/admin/content" style={{ color: adminTheme.textDim, textDecoration: "none", fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
            Content
          </a>
          <span style={{ color: adminTheme.textDim, fontSize: fontSize.xs }}>/</span>
          <span style={{ color: adminTheme.textMuted, fontSize: fontSize.sm }}>{page.draft.title}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: fontSize["2xl"], fontWeight: fontWeight.bold, margin: 0, color: adminTheme.text, letterSpacing: "-0.02em" }}>
            Edit Page
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            {isBlockMode && (
              <span style={{
                display: "inline-block",
                padding: `2px ${spacing.sm}`,
                fontSize: fontSize.xs,
                fontFamily: fontFamily.mono,
                fontWeight: fontWeight.medium,
                letterSpacing: "0.04em",
                borderRadius: radii.sm,
                backgroundColor: "rgba(200,165,90,0.12)",
                color: adminTheme.accent,
                border: `1px solid rgba(200,165,90,0.25)`,
              }}>
                blocks
              </span>
            )}
            <span style={{
              display: "inline-block",
              padding: `2px ${spacing.sm}`,
              fontSize: fontSize.xs,
              fontFamily: fontFamily.mono,
              fontWeight: fontWeight.medium,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              borderRadius: radii.sm,
              backgroundColor: page.status === "draft" ? "rgba(200,165,90,0.12)" : "rgba(80,180,100,0.12)",
              color: page.status === "draft" ? adminTheme.accent : adminTheme.success,
              border: `1px solid ${page.status === "draft" ? "rgba(200,165,90,0.25)" : "rgba(80,180,100,0.25)"}`,
            }}>
              {page.status}
            </span>
            <span style={{ fontSize: fontSize.xs, fontFamily: fontFamily.mono, color: adminTheme.textDim }}>
              v{page.version}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" style={{
          padding: `${spacing.sm} ${spacing.md}`,
          backgroundColor: "rgba(220,60,60,0.08)",
          border: "1px solid rgba(220,60,60,0.2)",
          borderRadius: radii.md,
          color: adminTheme.error,
          fontSize: fontSize.sm,
          marginBottom: spacing.md,
        }}>
          {error}
        </div>
      )}

      {publishSuccess && (
        <div style={{
          padding: `${spacing.sm} ${spacing.md}`,
          backgroundColor: "rgba(80,180,100,0.08)",
          border: "1px solid rgba(80,180,100,0.2)",
          borderRadius: radii.md,
          color: adminTheme.success,
          fontSize: fontSize.sm,
          marginBottom: spacing.md,
        }}>
          Published successfully.{" "}
          <a href={`/public/${page.published?.slug ?? slug}`} style={{ color: adminTheme.success, fontWeight: fontWeight.medium }}>
            View page →
          </a>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Published metadata */}
        {page.published && (
          <SectionCard title="Published Version" style={{ marginBottom: spacing.md }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.md }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: spacing.xs }}>URL</div>
                <a
                  href={`/public/${page.published.slug}`}
                  style={{ fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: adminTheme.accent, textDecoration: "none" }}
                >
                  /public/{page.published.slug}
                </a>
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: spacing.xs }}>Published At</div>
                <div style={{ fontSize: fontSize.sm, color: adminTheme.textMuted }}>
                  {new Date(page.published.publishedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: spacing.xs }}>Title</div>
                <div style={{ fontSize: fontSize.sm, color: adminTheme.textMuted }}>
                  {page.published.title}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Page Settings */}
        <SectionCard title="Page Settings" style={{ marginBottom: spacing.md }}>
          <div>
            <label htmlFor="title" style={labelStyle}>Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="slug" style={labelStyle}>URL Slug</label>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <span style={{ color: adminTheme.textDim, fontSize: fontSize.sm, fontFamily: fontFamily.mono, whiteSpace: "nowrap" }}>/public/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                style={{ ...inputStyle, fontFamily: fontFamily.mono, fontSize: fontSize.sm }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Content */}
        <SectionCard title={isBlockMode ? "Content Blocks" : "Content"} style={{ marginBottom: spacing.md }}>
          {isBlockMode ? (
            <BlockEditorPanel blocks={blocks} onChange={setBlocks} />
          ) : (
            <div>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
          )}
        </SectionCard>

        {/* Menu Placement */}
        <SectionCard title="Menu Placement" style={{ marginBottom: spacing.md }}>
          <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
            <input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} />
            <span style={{ fontSize: fontSize.sm, color: adminTheme.text }}>Show this page in a navigation menu</span>
          </label>

          {showInMenu && (
            <>
              <div>
                <label htmlFor="menuLocation" style={labelStyle}>Menu Location</label>
                <select
                  id="menuLocation"
                  value={menuLocation}
                  onChange={(e) => setMenuLocation(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select location...</option>
                  <option value="public_header">Public Header</option>
                  <option value="public_footer">Public Footer</option>
                  <option value="member_primary">Member Nav</option>
                </select>
              </div>
              <div>
                <label htmlFor="menuLabel" style={labelStyle}>Menu Label</label>
                <input
                  id="menuLabel"
                  type="text"
                  value={menuLabel}
                  onChange={(e) => setMenuLabel(e.target.value)}
                  placeholder={title || "Uses page title if blank"}
                  style={inputStyle}
                />
                <div style={{ fontSize: fontSize.xs, color: adminTheme.textDim, marginTop: spacing.xs }}>
                  Leave blank to use the page title as the menu label.
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* Sticky action bar */}
        <div style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: adminTheme.surface,
          borderTop: `1px solid ${adminTheme.border}`,
          borderRadius: `${radii.md} ${radii.md} 0 0`,
          padding: `${spacing.md} ${spacing.lg}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: spacing.lg,
          zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: publishing ? adminTheme.textDim : adminTheme.success,
                backgroundColor: publishing ? "transparent" : "rgba(80,180,100,0.08)",
                border: `1px solid ${publishing ? adminTheme.border : "rgba(80,180,100,0.25)"}`,
                borderRadius: radii.md,
                cursor: publishing ? "not-allowed" : "pointer",
                fontFamily: fontFamily.sans,
                transition: "background-color 150ms ease",
              }}
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
            {page.published && (
              <a
                href={`/public/${page.published.slug}`}
                target="_blank"
                rel="noopener"
                style={{
                  padding: `${spacing.sm} ${spacing.md}`,
                  fontSize: fontSize.sm,
                  color: adminTheme.textMuted,
                  textDecoration: "none",
                  border: `1px solid ${adminTheme.border}`,
                  borderRadius: radii.md,
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: fontWeight.medium,
                }}
              >
                View Live →
              </a>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            {saveSuccess && (
              <span style={{ color: adminTheme.success, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>Saved</span>
            )}
            <a
              href="/admin/content"
              style={{
                padding: `${spacing.sm} ${spacing.md}`,
                fontSize: fontSize.sm,
                color: adminTheme.textMuted,
                textDecoration: "none",
                border: `1px solid ${adminTheme.border}`,
                borderRadius: radii.md,
                display: "inline-flex",
                alignItems: "center",
                fontWeight: fontWeight.medium,
              }}
            >
              Back
            </a>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: `${spacing.sm} ${spacing.xl}`,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: adminTheme.bg,
                backgroundColor: saving ? "#8a7340" : adminTheme.accent,
                border: "none",
                borderRadius: radii.md,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                fontFamily: fontFamily.sans,
                transition: "background-color 150ms ease, opacity 150ms ease",
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
