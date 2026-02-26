"use client";

import React, { useState } from "react";
import type { PageBlock } from "@club-os/domain-core";
import {
  spacing,
  fontSize,
  fontWeight,
  fontFamily,
  adminTheme,
  radii,
  getAllBlockDefinitions,
  getBlockDefinition,
  BlockRenderer,
} from "@club-os/ui-kit";
import type { EditorField } from "@club-os/ui-kit";

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: `${spacing.sm} ${spacing.sm}`,
  fontSize: fontSize.sm,
  fontFamily: fontFamily.sans,
  backgroundColor: adminTheme.bg,
  border: `1px solid ${adminTheme.border}`,
  borderRadius: radii.md,
  color: adminTheme.text,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms ease",
};

const smallBtnStyle: React.CSSProperties = {
  padding: `${spacing.xs} ${spacing.sm}`,
  fontSize: fontSize.xs,
  fontFamily: fontFamily.sans,
  backgroundColor: "transparent",
  border: `1px solid ${adminTheme.border}`,
  borderRadius: radii.sm,
  color: adminTheme.textMuted,
  cursor: "pointer",
  transition: "background-color 150ms ease, color 150ms ease",
};

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strVal = typeof value === "string" ? value : String(value ?? "");

  if (field.type === "textarea") {
    return (
      <textarea
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ ...fieldInputStyle, resize: "vertical", lineHeight: 1.5 }}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <select
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        style={fieldInputStyle}
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "boolean") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: spacing.sm, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontSize: fontSize.sm, color: adminTheme.text }}>{field.label}</span>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        style={fieldInputStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
      style={fieldInputStyle}
    />
  );
}

function BlockEditorItem({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: PageBlock;
  index: number;
  total: number;
  onUpdate: (props: Record<string, unknown>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const definition = getBlockDefinition(block.type);
  const displayName = definition?.displayName ?? block.type;

  return (
    <div
      style={{
        backgroundColor: adminTheme.surface,
        border: `1px solid ${expanded ? adminTheme.borderHover : adminTheme.border}`,
        borderRadius: radii.md,
        transition: "border-color 150ms ease",
      }}
    >
      {/* Block header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${spacing.sm} ${spacing.md}`,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <span style={{
            width: "1.5rem",
            height: "1.5rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: fontSize.xs,
            color: adminTheme.textDim,
            fontFamily: fontFamily.mono,
            backgroundColor: adminTheme.bg,
            borderRadius: radii.sm,
            fontWeight: fontWeight.medium,
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: adminTheme.text }}>
            {displayName}
          </span>
          <span style={{ fontSize: fontSize.xs, fontFamily: fontFamily.mono, color: adminTheme.textDim }}>
            {block.type}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            style={{ ...smallBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            style={{ ...smallBtnStyle, opacity: index === total - 1 ? 0.3 : 1 }}
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{ ...smallBtnStyle, color: adminTheme.error }}
            title="Remove block"
          >
            ✕
          </button>
          <span style={{ fontSize: fontSize.sm, color: adminTheme.textDim, marginLeft: spacing.xs }}>
            {expanded ? "▾" : "▸"}
          </span>
        </div>
      </div>

      {/* Block fields */}
      {expanded && definition && (
        <div
          style={{
            padding: `${spacing.sm} ${spacing.md} ${spacing.lg}`,
            borderTop: `1px solid ${adminTheme.border}`,
            display: "flex",
            flexDirection: "column",
            gap: spacing.md,
          }}
        >
          {definition.editorFields.map((field) => (
            <div key={field.key}>
              {field.type !== "boolean" && (
                <label
                  style={{
                    display: "block",
                    fontSize: fontSize.xs,
                    fontFamily: fontFamily.mono,
                    fontWeight: fontWeight.medium,
                    color: adminTheme.textMuted,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginBottom: spacing.xs,
                  }}
                >
                  {field.label}
                </label>
              )}
              <FieldEditor
                field={field}
                value={block.props[field.key]}
                onChange={(val) => onUpdate({ ...block.props, [field.key]: val })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlockEditorPanel({
  blocks,
  onChange,
}: {
  blocks: PageBlock[];
  onChange: (blocks: PageBlock[]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const allDefinitions = getAllBlockDefinitions();

  function addBlock(type: string) {
    const def = getBlockDefinition(type);
    if (!def) return;
    const newBlock: PageBlock = {
      id: crypto.randomUUID(),
      type,
      props: { ...def.defaultProps },
    };
    onChange([...blocks, newBlock]);
    setShowPicker(false);
  }

  function updateBlock(index: number, props: Record<string, unknown>) {
    const updated = blocks.map((b, i) => (i === index ? { ...b, props } : b));
    onChange(updated);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index]!;
    updated[index] = updated[target]!;
    updated[target] = temp;
    onChange(updated);
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${adminTheme.border}`,
      }}>
        <span style={{ fontSize: fontSize.sm, color: adminTheme.textMuted, fontWeight: fontWeight.medium }}>
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          style={{
            ...smallBtnStyle,
            padding: `${spacing.xs} ${spacing.md}`,
            color: showPreview ? adminTheme.accent : adminTheme.textMuted,
            borderColor: showPreview ? adminTheme.accent : adminTheme.border,
            fontWeight: fontWeight.medium,
          }}
        >
          {showPreview ? "Hide Preview" : "Preview"}
        </button>
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: radii.md,
            marginBottom: spacing.lg,
            border: `2px solid ${adminTheme.accent}`,
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: `${spacing.xs} ${spacing.md}`,
            backgroundColor: "rgba(200,165,90,0.08)",
            borderBottom: `1px solid rgba(200,165,90,0.15)`,
            fontSize: fontSize.xs,
            fontFamily: fontFamily.mono,
            color: adminTheme.accent,
            fontWeight: fontWeight.medium,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            Preview
          </div>
          <div>
            <BlockRenderer blocks={blocks} isAdmin />
          </div>
        </div>
      )}

      {/* Block list */}
      {blocks.length === 0 && !showPicker && (
        <div style={{
          textAlign: "center",
          padding: `${spacing.xl} ${spacing.md}`,
          color: adminTheme.textDim,
          fontSize: fontSize.sm,
        }}>
          No blocks yet. Click "Add Block" below to get started.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
        {blocks.map((block, index) => (
          <BlockEditorItem
            key={block.id}
            block={block}
            index={index}
            total={blocks.length}
            onUpdate={(props) => updateBlock(index, props)}
            onRemove={() => removeBlock(index)}
            onMoveUp={() => moveBlock(index, -1)}
            onMoveDown={() => moveBlock(index, 1)}
          />
        ))}
      </div>

      {/* Add block */}
      <div style={{ marginTop: spacing.md }}>
        {showPicker ? (
          <div
            style={{
              backgroundColor: adminTheme.surface,
              border: `1px solid ${adminTheme.border}`,
              borderRadius: radii.md,
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: `${spacing.sm} ${spacing.md}`,
              borderBottom: `1px solid ${adminTheme.border}`,
              backgroundColor: adminTheme.surfaceRaised,
            }}>
              <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: adminTheme.text }}>
                Choose Block Type
              </span>
              <button onClick={() => setShowPicker(false)} style={smallBtnStyle}>
                Cancel
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: spacing.xs,
                padding: spacing.md,
              }}
            >
              {allDefinitions.map((def) => (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type)}
                  style={{
                    padding: spacing.md,
                    backgroundColor: adminTheme.bg,
                    border: `1px solid ${adminTheme.border}`,
                    borderRadius: radii.md,
                    color: adminTheme.text,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: fontFamily.sans,
                    transition: "border-color 150ms ease",
                  }}
                >
                  <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: "2px" }}>
                    {def.displayName}
                  </div>
                  <div style={{ fontSize: fontSize.xs, color: adminTheme.textDim }}>
                    {def.type}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            style={{
              width: "100%",
              padding: spacing.md,
              backgroundColor: "transparent",
              border: `2px dashed ${adminTheme.border}`,
              borderRadius: radii.md,
              color: adminTheme.textMuted,
              cursor: "pointer",
              fontFamily: fontFamily.sans,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              transition: "border-color 150ms ease, color 150ms ease",
            }}
          >
            + Add Block
          </button>
        )}
      </div>
    </div>
  );
}
