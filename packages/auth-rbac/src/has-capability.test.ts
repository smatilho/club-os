import { describe, it, expect } from "vitest";
import { hasCapability, type PolicyContext } from "./index";

describe("hasCapability", () => {
  const context: PolicyContext = {
    actorId: "u1",
    organizationId: "org1",
    capabilities: ["content.read", "reservation.read"],
  };

  it("returns true for present capability", () => {
    expect(hasCapability(context, "content.read")).toBe(true);
  });

  it("returns false for missing capability", () => {
    expect(hasCapability(context, "finance.manage")).toBe(false);
  });

  it("returns false for empty capabilities", () => {
    const empty: PolicyContext = { ...context, capabilities: [] };
    expect(hasCapability(empty, "content.read")).toBe(false);
  });
});
