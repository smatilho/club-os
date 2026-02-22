import { describe, it, expect } from "vitest";
import { validateModuleManifest } from "./index";

describe("validateModuleManifest", () => {
  it("validates a correct manifest", () => {
    const result = validateModuleManifest({
      schemaVersion: "1.0",
      name: "test",
      version: "1.0.0",
      displayName: "Test",
      description: "Test module description",
      owner: "platform",
      activation: {
        defaultEnabled: true,
        configSchema: "/schemas/test.json",
      },
      routes: [
        {
          app: "web",
          area: "member",
          path: "/member/test",
          visibility: "authenticated",
        },
      ],
      capabilities: ["test.read"],
    });
    expect(result.name).toBe("test");
  });

  it("rejects null", () => {
    expect(() => validateModuleManifest(null as unknown)).toThrow(
      "must be an object",
    );
  });

  it("rejects missing name", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Missing name entry",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x.read"],
      }),
    ).toThrow("'name'");
  });

  it("rejects missing version", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        displayName: "Xyz",
        description: "Missing version entry",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x.read"],
      }),
    ).toThrow("'version'");
  });

  it("rejects empty capabilities", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Capability list is empty",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: [],
      }),
    ).toThrow("capability");
  });

  it("rejects missing schemaVersion", () => {
    expect(() =>
      validateModuleManifest({
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Missing schema version",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x.read"],
      }),
    ).toThrow("schemaVersion");
  });

  it("rejects missing routes", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Missing routes array",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        capabilities: ["x.read"],
      }),
    ).toThrow("routes");
  });

  it("rejects invalid capability namespace", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Capability must be namespaced",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x"],
      }),
    ).toThrow("capability");
  });

  it("rejects duplicate capabilities", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Duplicate capability entries",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x.read", "x.read"],
      }),
    ).toThrow("unique");
  });

  it("rejects unknown top-level fields", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Unknown field should fail",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [{ app: "api", area: "shared", path: "/api/x", visibility: "internal" }],
        capabilities: ["x.read"],
        extra: true,
      }),
    ).toThrow("unknown field");
  });

  it("rejects unknown nested route fields", () => {
    expect(() =>
      validateModuleManifest({
        schemaVersion: "1.0",
        name: "x",
        version: "1.0.0",
        displayName: "Xyz",
        description: "Unknown route field should fail",
        owner: "platform",
        activation: { defaultEnabled: true, configSchema: "/schema.json" },
        routes: [
          {
            app: "api",
            area: "shared",
            path: "/api/x",
            visibility: "internal",
            method: "GET",
          },
        ],
        capabilities: ["x.read"],
      }),
    ).toThrow("unknown field");
  });
});
