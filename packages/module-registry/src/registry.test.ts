import { describe, it, expect } from "vitest";
import { ModuleRegistry } from "./registry";
import type { ModuleManifest } from "./index";

describe("ModuleRegistry", () => {
  function manifest(name: string): ModuleManifest {
    return {
      schemaVersion: "1.0",
      name,
      version: "1.0.0",
      displayName: name.toUpperCase(),
      description: `${name} module for registry tests`,
      owner: "platform",
      activation: {
        defaultEnabled: true,
        configSchema: `/schemas/${name}.json`,
      },
      routes: [
        {
          app: "web",
          area: "shared",
          path: `/shared/${name}`,
          visibility: "authenticated",
        },
      ],
      capabilities: [`${name}.read`],
    };
  }

  it("registers and retrieves a module", () => {
    const registry = new ModuleRegistry();
    const m = manifest("test");
    registry.register(m);
    expect(registry.get("test")).toEqual(m);
  });

  it("returns undefined for unknown module", () => {
    const registry = new ModuleRegistry();
    expect(registry.get("unknown")).toBeUndefined();
  });

  it("lists registered modules in insertion order", () => {
    const registry = new ModuleRegistry();
    registry.register(manifest("a"));
    registry.register(manifest("b"));
    expect(registry.list().map((m) => m.name)).toEqual(["a", "b"]);
  });

  it("reports has correctly", () => {
    const registry = new ModuleRegistry();
    registry.register(manifest("x"));
    expect(registry.has("x")).toBe(true);
    expect(registry.has("y")).toBe(false);
  });

  it("rejects duplicate registration", () => {
    const registry = new ModuleRegistry();
    registry.register(manifest("dup"));
    expect(() => registry.register(manifest("dup"))).toThrow("already registered");
  });
});
