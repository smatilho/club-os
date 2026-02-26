import { describe, it, expect, beforeEach } from "vitest";

// Fresh import each time — we need the side-effect definitions
import {
  registerBlock,
  getBlockDefinition,
  getAllBlockDefinitions,
} from "./registry";

// Trigger block registrations
import "./definitions";

describe("BlockRegistry", () => {
  it("registers and retrieves a block definition", () => {
    const hero = getBlockDefinition("hero");
    expect(hero).toBeDefined();
    expect(hero!.type).toBe("hero");
    expect(hero!.displayName).toBe("Hero Banner");
  });

  it("returns undefined for unknown block type", () => {
    expect(getBlockDefinition("nonexistent_block")).toBeUndefined();
  });

  it("lists all registered definitions", () => {
    const all = getAllBlockDefinitions();
    expect(all.length).toBeGreaterThanOrEqual(12);
    const types = all.map((d) => d.type);
    expect(types).toContain("hero");
    expect(types).toContain("rich_text");
    expect(types).toContain("callout");
    expect(types).toContain("cta");
    expect(types).toContain("card_grid");
    expect(types).toContain("feature_list");
    expect(types).toContain("two_column");
    expect(types).toContain("image");
    expect(types).toContain("faq");
    expect(types).toContain("stats");
    expect(types).toContain("section_heading");
    expect(types).toContain("divider");
  });

  it("each definition has required fields", () => {
    const all = getAllBlockDefinitions();
    for (const def of all) {
      expect(def.type).toBeTruthy();
      expect(def.displayName).toBeTruthy();
      expect(def.schema).toBeDefined();
      expect(def.defaultProps).toBeDefined();
      expect(Array.isArray(def.editorFields)).toBe(true);
      expect(def.editorFields.length).toBeGreaterThan(0);
    }
  });

  it("editor fields have required attributes", () => {
    const all = getAllBlockDefinitions();
    for (const def of all) {
      for (const field of def.editorFields) {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(["text", "textarea", "number", "select", "boolean", "color"]).toContain(field.type);
      }
    }
  });

  it("select fields have options array", () => {
    const all = getAllBlockDefinitions();
    for (const def of all) {
      for (const field of def.editorFields) {
        if (field.type === "select") {
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("default props keys match editor field keys", () => {
    const all = getAllBlockDefinitions();
    for (const def of all) {
      const fieldKeys = def.editorFields.map((f) => f.key);
      for (const key of fieldKeys) {
        expect(def.defaultProps).toHaveProperty(key);
      }
    }
  });

  it("allows registering a custom block", () => {
    registerBlock({
      type: "test_custom",
      displayName: "Test Custom",
      schema: { foo: "string" },
      defaultProps: { foo: "bar" },
      editorFields: [{ key: "foo", label: "Foo", type: "text" }],
    });
    const custom = getBlockDefinition("test_custom");
    expect(custom).toBeDefined();
    expect(custom!.displayName).toBe("Test Custom");
  });
});
