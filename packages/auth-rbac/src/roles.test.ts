import { describe, it, expect } from "vitest";
import { ROLE_CAPABILITY_MAP, resolveCapabilities, type Role } from "./roles";

describe("ROLE_CAPABILITY_MAP", () => {
  it("member has baseline read capabilities", () => {
    const caps = ROLE_CAPABILITY_MAP.member;
    expect(caps).toContain("content.read");
    expect(caps).toContain("community.read");
    expect(caps).toContain("community.write");
    expect(caps).toContain("community.comment");
    expect(caps).toContain("community.report");
    expect(caps).toContain("reservation.read");
    expect(caps).toContain("membership.read");
    expect(caps).toContain("events.read");
    expect(caps).toContain("notifications.read");
    expect(caps).not.toContain("content.write");
    expect(caps).not.toContain("settings.manage");
    expect(caps).not.toContain("community.moderate");
    expect(caps).not.toContain("events.manage");
  });

  it("reservationist extends member with reservation management", () => {
    const caps = ROLE_CAPABILITY_MAP.reservationist;
    // Has member baseline
    expect(caps).toContain("content.read");
    // Plus reservation management
    expect(caps).toContain("reservation.manage");
    expect(caps).toContain("reservation.override");
  });

  it("treasurer extends member with finance capabilities", () => {
    const caps = ROLE_CAPABILITY_MAP.treasurer;
    expect(caps).toContain("content.read");
    expect(caps).toContain("finance.read");
    expect(caps).toContain("finance.manage");
    expect(caps).toContain("finance.refund");
  });

  it("webmaster extends member with content management", () => {
    const caps = ROLE_CAPABILITY_MAP.webmaster;
    expect(caps).toContain("content.read");
    expect(caps).toContain("content.write");
    expect(caps).toContain("content.publish");
    expect(caps).toContain("settings.read");
  });

  it("org_admin has all tenant-scoped capabilities", () => {
    const caps = ROLE_CAPABILITY_MAP.org_admin;
    expect(caps).toContain("settings.manage");
    expect(caps).toContain("audit.read");
    expect(caps).toContain("membership.manage");
    expect(caps).toContain("finance.refund");
    expect(caps).toContain("community.read");
    expect(caps).toContain("community.write");
    expect(caps).toContain("community.comment");
    expect(caps).toContain("community.report");
    expect(caps).toContain("community.moderate");
    expect(caps).toContain("events.read");
    expect(caps).toContain("events.write");
    expect(caps).toContain("events.publish");
    expect(caps).toContain("events.manage");
    expect(caps).toContain("notifications.read");
    expect(caps).toContain("reservation.override");
    expect(caps).toContain("content.publish");
  });

  it("platform_admin has no tenant capabilities", () => {
    expect(ROLE_CAPABILITY_MAP.platform_admin).toHaveLength(0);
  });
});

describe("resolveCapabilities", () => {
  it("returns empty array for empty roles", () => {
    expect(resolveCapabilities([])).toEqual([]);
  });

  it("returns capabilities for a single role", () => {
    const caps = resolveCapabilities(["member"]);
    expect(caps).toContain("content.read");
    expect(caps).toContain("reservation.read");
  });

  it("deduplicates capabilities from multiple roles", () => {
    const caps = resolveCapabilities(["member", "reservationist"]);
    // content.read appears in both, should only appear once
    const contentReadCount = caps.filter((c) => c === "content.read").length;
    expect(contentReadCount).toBe(1);
    // Should have reservation.manage from reservationist
    expect(caps).toContain("reservation.manage");
  });

  it("combines capabilities from multiple roles", () => {
    const caps = resolveCapabilities(["treasurer", "webmaster"]);
    expect(caps).toContain("finance.manage");
    expect(caps).toContain("content.publish");
  });

  it("ignores unknown roles gracefully", () => {
    const caps = resolveCapabilities(["member", "nonexistent" as Role]);
    expect(caps).toContain("content.read");
  });
});
