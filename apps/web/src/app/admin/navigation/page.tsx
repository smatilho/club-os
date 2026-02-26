"use client";

import { useState, useEffect, useCallback } from "react";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
} from "@club-os/ui-kit";

interface MenuItem {
  id: string;
  label: string;
  linkType: string;
  linkTarget: string;
  location: string;
  parentId: string | null;
  sortOrder: number;
  visibility: string;
  contentPageId: string | null;
}

const LOCATIONS = [
  { value: "public_header", label: "Public Header" },
  { value: "public_footer", label: "Public Footer" },
  { value: "member_primary", label: "Member Nav" },
  { value: "admin_primary", label: "Admin Nav" },
];

const LINK_TYPES = [
  { value: "internal_path", label: "Internal Path" },
  { value: "internal_page", label: "Content Page" },
  { value: "external", label: "External URL" },
];

const VISIBILITIES = [
  { value: "always", label: "Always" },
  { value: "authenticated", label: "Authenticated Only" },
  { value: "unauthenticated", label: "Unauthenticated Only" },
];

async function fetchItems(): Promise<MenuItem[]> {
  const res = await fetch("/api/admin/navigation/menus");
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function createItem(
  item: Omit<MenuItem, "id" | "sortOrder" | "contentPageId">,
): Promise<MenuItem | null> {
  const res = await fetch("/api/admin/navigation/menu-items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

async function updateItem(
  id: string,
  updates: Partial<MenuItem>,
): Promise<MenuItem | null> {
  const res = await fetch(`/api/admin/navigation/menu-items/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

async function deleteItem(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/navigation/menu-items/${id}`, {
    method: "DELETE",
  });
  return res.ok;
}

const inputStyle: React.CSSProperties = {
  padding: `${spacing.xs} ${spacing.sm}`,
  fontSize: fontSize.sm,
  backgroundColor: adminTheme.bg,
  color: adminTheme.text,
  border: `1px solid ${adminTheme.border}`,
  borderRadius: radii.sm,
  fontFamily: fontFamily.sans,
  width: "100%",
};

const btnStyle: React.CSSProperties = {
  padding: `${spacing.xs} ${spacing.md}`,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  border: "none",
  borderRadius: radii.sm,
  cursor: "pointer",
  fontFamily: fontFamily.sans,
};

export default function NavigationAdminPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeLocation, setActiveLocation] = useState("public_header");
  const [showForm, setShowForm] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formLinkType, setFormLinkType] = useState("internal_path");
  const [formLinkTarget, setFormLinkTarget] = useState("");
  const [formVisibility, setFormVisibility] = useState("always");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await fetchItems();
    setItems(all);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locationItems = items
    .filter((i) => i.location === activeLocation)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const topLevel = locationItems.filter((i) => !i.parentId);

  async function handleCreate() {
    setError(null);
    if (!formLabel.trim() || !formLinkTarget.trim()) {
      setError("Label and link target are required");
      return;
    }
    const item = await createItem({
      location: activeLocation,
      label: formLabel,
      linkType: formLinkType,
      linkTarget: formLinkTarget,
      visibility: formVisibility,
      parentId: null,
    });
    if (!item) {
      setError("Failed to create menu item");
      return;
    }
    setFormLabel("");
    setFormLinkTarget("");
    setShowForm(false);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteItem(id);
    await load();
  }

  async function handleMoveUp(item: MenuItem) {
    const siblings = topLevel;
    const idx = siblings.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    if (!prev) return;
    await updateItem(item.id, { sortOrder: prev.sortOrder });
    await updateItem(prev.id, { sortOrder: item.sortOrder });
    await load();
  }

  async function handleMoveDown(item: MenuItem) {
    const siblings = topLevel;
    const idx = siblings.findIndex((i) => i.id === item.id);
    if (idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    if (!next) return;
    await updateItem(item.id, { sortOrder: next.sortOrder });
    await updateItem(next.id, { sortOrder: item.sortOrder });
    await load();
  }

  return (
    <div style={{ maxWidth: "800px" }}>
      <h1
        style={{
          fontSize: fontSize["2xl"],
          fontWeight: fontWeight.bold,
          marginBottom: spacing.lg,
          color: adminTheme.text,
        }}
      >
        Navigation
      </h1>

      {/* Location tabs */}
      <div
        style={{
          display: "flex",
          gap: spacing.xs,
          marginBottom: spacing.xl,
          borderBottom: `1px solid ${adminTheme.border}`,
          paddingBottom: spacing.sm,
        }}
      >
        {LOCATIONS.map((loc) => (
          <button
            key={loc.value}
            onClick={() => setActiveLocation(loc.value)}
            style={{
              ...btnStyle,
              backgroundColor:
                activeLocation === loc.value
                  ? adminTheme.accent
                  : "transparent",
              color:
                activeLocation === loc.value
                  ? adminTheme.bg
                  : adminTheme.textMuted,
            }}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div style={{ marginBottom: spacing.lg }}>
        {topLevel.length === 0 && (
          <p style={{ color: adminTheme.textMuted, fontSize: fontSize.sm }}>
            No menu items for this location.
          </p>
        )}
        {topLevel.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: adminTheme.surface,
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.sm,
              marginBottom: spacing.xs,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: fontSize.base,
                color: adminTheme.text,
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: fontSize.xs,
                color: adminTheme.textDim,
                fontFamily: fontFamily.mono,
              }}
            >
              {item.linkTarget}
            </span>
            <button
              onClick={() => handleMoveUp(item)}
              disabled={idx === 0}
              style={{
                ...btnStyle,
                backgroundColor: "transparent",
                color: idx === 0 ? adminTheme.textDim : adminTheme.textMuted,
                padding: spacing.xs,
              }}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => handleMoveDown(item)}
              disabled={idx === topLevel.length - 1}
              style={{
                ...btnStyle,
                backgroundColor: "transparent",
                color:
                  idx === topLevel.length - 1
                    ? adminTheme.textDim
                    : adminTheme.textMuted,
                padding: spacing.xs,
              }}
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              style={{
                ...btnStyle,
                backgroundColor: "transparent",
                color: adminTheme.error,
                padding: spacing.xs,
              }}
              aria-label="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            ...btnStyle,
            backgroundColor: adminTheme.accent,
            color: adminTheme.bg,
          }}
        >
          Add Menu Item
        </button>
      ) : (
        <div
          style={{
            padding: spacing.lg,
            backgroundColor: adminTheme.surface,
            border: `1px solid ${adminTheme.border}`,
            borderRadius: radii.md,
          }}
        >
          <h3
            style={{
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
              marginBottom: spacing.md,
              color: adminTheme.text,
            }}
          >
            New Menu Item
          </h3>

          {error && (
            <p
              style={{
                color: adminTheme.error,
                fontSize: fontSize.sm,
                marginBottom: spacing.sm,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ marginBottom: spacing.sm }}>
            <label
              style={{
                display: "block",
                fontSize: fontSize.sm,
                color: adminTheme.textMuted,
                marginBottom: spacing.xs,
              }}
            >
              Label
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              style={inputStyle}
              placeholder="About Us"
            />
          </div>

          <div style={{ marginBottom: spacing.sm }}>
            <label
              style={{
                display: "block",
                fontSize: fontSize.sm,
                color: adminTheme.textMuted,
                marginBottom: spacing.xs,
              }}
            >
              Link Type
            </label>
            <select
              value={formLinkType}
              onChange={(e) => setFormLinkType(e.target.value)}
              style={inputStyle}
            >
              {LINK_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: spacing.sm }}>
            <label
              style={{
                display: "block",
                fontSize: fontSize.sm,
                color: adminTheme.textMuted,
                marginBottom: spacing.xs,
              }}
            >
              Link Target
            </label>
            <input
              type="text"
              value={formLinkTarget}
              onChange={(e) => setFormLinkTarget(e.target.value)}
              style={inputStyle}
              placeholder="/public/about"
            />
          </div>

          <div style={{ marginBottom: spacing.md }}>
            <label
              style={{
                display: "block",
                fontSize: fontSize.sm,
                color: adminTheme.textMuted,
                marginBottom: spacing.xs,
              }}
            >
              Visibility
            </label>
            <select
              value={formVisibility}
              onChange={(e) => setFormVisibility(e.target.value)}
              style={inputStyle}
            >
              {VISIBILITIES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: spacing.sm }}>
            <button
              onClick={handleCreate}
              style={{
                ...btnStyle,
                backgroundColor: adminTheme.accent,
                color: adminTheme.bg,
              }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              style={{
                ...btnStyle,
                backgroundColor: "transparent",
                color: adminTheme.textMuted,
                border: `1px solid ${adminTheme.border}`,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
