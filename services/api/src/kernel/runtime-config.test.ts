import { describe, expect, it } from "vitest";
import { getApiRuntimeConfig } from "./runtime-config";

describe("getApiRuntimeConfig", () => {
  it("returns defaults when env is empty", () => {
    const config = getApiRuntimeConfig({});
    expect(config.port).toBe(4000);
    expect(config.defaultOrgId).toBe("org-default");
    expect(config.autoSeed).toBe(true);
  });

  it("parses explicit env values", () => {
    const config = getApiRuntimeConfig({
      PORT: "4100",
      CLUB_OS_DEFAULT_ORG_ID: "org-demo",
      CLUB_OS_AUTO_SEED: "false",
    });
    expect(config.port).toBe(4100);
    expect(config.defaultOrgId).toBe("org-demo");
    expect(config.autoSeed).toBe(false);
  });

  it("rejects invalid port", () => {
    expect(() => getApiRuntimeConfig({ PORT: "0" })).toThrow(/Invalid PORT/);
  });

  it("rejects invalid default org id", () => {
    expect(() =>
      getApiRuntimeConfig({ CLUB_OS_DEFAULT_ORG_ID: "ORG DEFAULT" }),
    ).toThrow(/Invalid CLUB_OS_DEFAULT_ORG_ID/);
  });

  it("rejects invalid auto-seed boolean", () => {
    expect(() =>
      getApiRuntimeConfig({ CLUB_OS_AUTO_SEED: "maybe" }),
    ).toThrow(/Invalid boolean value/);
  });
});
