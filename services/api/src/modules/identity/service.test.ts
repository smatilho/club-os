import { describe, it, expect, beforeEach } from "vitest";
import { IdentityService } from "./service";
import type { OrgId, UserId } from "@club-os/domain-core";

describe("IdentityService", () => {
  let service: IdentityService;

  beforeEach(() => {
    service = new IdentityService();
  });

  // --- Users ---

  describe("users", () => {
    it("creates a user", () => {
      const result = service.createUser({
        email: "alice@example.com",
        displayName: "Alice",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe("alice@example.com");
        expect(result.value.displayName).toBe("Alice");
        expect(result.value.id).toBeDefined();
      }
    });

    it("rejects duplicate email", () => {
      service.createUser({ email: "alice@example.com", displayName: "Alice" });
      const result = service.createUser({
        email: "alice@example.com",
        displayName: "Alice 2",
      });
      expect(result.ok).toBe(false);
    });

    it("retrieves user by id", () => {
      const created = service.createUser({
        email: "bob@example.com",
        displayName: "Bob",
      });
      if (!created.ok) throw new Error("setup failed");

      const result = service.getUser(created.value.id);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.email).toBe("bob@example.com");
      }
    });

    it("returns error for unknown user", () => {
      const result = service.getUser("nonexistent" as UserId);
      expect(result.ok).toBe(false);
    });
  });

  // --- Organizations ---

  describe("organizations", () => {
    it("creates an organization", () => {
      const result = service.createOrganization({
        slug: "test-club",
        name: "Test Club",
        timezone: "America/New_York",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.slug).toBe("test-club");
      }
    });

    it("rejects duplicate slug", () => {
      service.createOrganization({
        slug: "test-club",
        name: "Test Club",
        timezone: "America/New_York",
      });
      const result = service.createOrganization({
        slug: "test-club",
        name: "Another Club",
        timezone: "America/Chicago",
      });
      expect(result.ok).toBe(false);
    });
  });

  // --- Memberships ---

  describe("memberships", () => {
    let userIdValue: UserId;
    let orgIdValue: OrgId;

    beforeEach(() => {
      const user = service.createUser({
        email: "test@example.com",
        displayName: "Test",
      });
      const org = service.createOrganization({
        slug: "club",
        name: "Club",
        timezone: "UTC",
      });
      if (!user.ok || !org.ok) throw new Error("setup failed");
      userIdValue = user.value.id;
      orgIdValue = org.value.id;
    });

    it("creates a membership", () => {
      const result = service.createMembership({
        userId: userIdValue,
        organizationId: orgIdValue,
        roles: ["member"],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.userId).toBe(userIdValue);
        expect(result.value.organizationId).toBe(orgIdValue);
        expect(result.value.roles).toEqual(["member"]);
        expect(result.value.status).toBe("active");
      }
    });

    it("rejects duplicate active membership", () => {
      service.createMembership({
        userId: userIdValue,
        organizationId: orgIdValue,
        roles: ["member"],
      });
      const result = service.createMembership({
        userId: userIdValue,
        organizationId: orgIdValue,
        roles: ["member"],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects membership for unknown user", () => {
      const result = service.createMembership({
        userId: "nope" as UserId,
        organizationId: orgIdValue,
        roles: ["member"],
      });
      expect(result.ok).toBe(false);
    });

    it("rejects membership for unknown org", () => {
      const result = service.createMembership({
        userId: userIdValue,
        organizationId: "nope" as OrgId,
        roles: ["member"],
      });
      expect(result.ok).toBe(false);
    });
  });

  // --- Tenant isolation ---

  describe("tenant isolation", () => {
    it("listMembershipsForOrg only returns memberships for that org", () => {
      const user = service.createUser({
        email: "multi@example.com",
        displayName: "Multi",
      });
      const org1 = service.createOrganization({
        slug: "org1",
        name: "Org 1",
        timezone: "UTC",
      });
      const org2 = service.createOrganization({
        slug: "org2",
        name: "Org 2",
        timezone: "UTC",
      });
      if (!user.ok || !org1.ok || !org2.ok) throw new Error("setup failed");

      service.createMembership({
        userId: user.value.id,
        organizationId: org1.value.id,
        roles: ["member"],
      });
      service.createMembership({
        userId: user.value.id,
        organizationId: org2.value.id,
        roles: ["org_admin"],
      });

      const org1Members = service.listMembershipsForOrg(org1.value.id);
      expect(org1Members).toHaveLength(1);
      expect(org1Members[0].organizationId).toBe(org1.value.id);

      const org2Members = service.listMembershipsForOrg(org2.value.id);
      expect(org2Members).toHaveLength(1);
      expect(org2Members[0].organizationId).toBe(org2.value.id);
    });

    it("listMembershipsForUser scopes to specific org", () => {
      const user = service.createUser({
        email: "scoped@example.com",
        displayName: "Scoped",
      });
      const org1 = service.createOrganization({
        slug: "scope1",
        name: "Scope 1",
        timezone: "UTC",
      });
      const org2 = service.createOrganization({
        slug: "scope2",
        name: "Scope 2",
        timezone: "UTC",
      });
      if (!user.ok || !org1.ok || !org2.ok) throw new Error("setup failed");

      service.createMembership({
        userId: user.value.id,
        organizationId: org1.value.id,
        roles: ["member"],
      });
      service.createMembership({
        userId: user.value.id,
        organizationId: org2.value.id,
        roles: ["org_admin"],
      });

      const org1Memberships = service.listMembershipsForUser(
        user.value.id,
        org1.value.id,
      );
      expect(org1Memberships).toHaveLength(1);
      expect(org1Memberships[0].roles).toEqual(["member"]);

      const org2Memberships = service.listMembershipsForUser(
        user.value.id,
        org2.value.id,
      );
      expect(org2Memberships).toHaveLength(1);
      expect(org2Memberships[0].roles).toEqual(["org_admin"]);
    });
  });

  // --- Role assignments ---

  describe("role assignments", () => {
    it("assigns a role to a membership", () => {
      const user = service.createUser({
        email: "role@example.com",
        displayName: "Role",
      });
      const org = service.createOrganization({
        slug: "role-org",
        name: "Role Org",
        timezone: "UTC",
      });
      if (!user.ok || !org.ok) throw new Error("setup failed");

      const membership = service.createMembership({
        userId: user.value.id,
        organizationId: org.value.id,
        roles: ["member"],
      });
      if (!membership.ok) throw new Error("setup failed");

      const result = service.assignRole(membership.value.id, "treasurer");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.roles).toEqual(["member", "treasurer"]);
      }
    });

    it("rejects duplicate role assignment", () => {
      const user = service.createUser({
        email: "dup@example.com",
        displayName: "Dup",
      });
      const org = service.createOrganization({
        slug: "dup-org",
        name: "Dup Org",
        timezone: "UTC",
      });
      if (!user.ok || !org.ok) throw new Error("setup failed");

      const membership = service.createMembership({
        userId: user.value.id,
        organizationId: org.value.id,
        roles: ["member"],
      });
      if (!membership.ok) throw new Error("setup failed");

      const result = service.assignRole(membership.value.id, "member");
      expect(result.ok).toBe(false);
    });

    it("removes a role from a membership", () => {
      const user = service.createUser({
        email: "remove@example.com",
        displayName: "Remove",
      });
      const org = service.createOrganization({
        slug: "remove-org",
        name: "Remove Org",
        timezone: "UTC",
      });
      if (!user.ok || !org.ok) throw new Error("setup failed");

      const membership = service.createMembership({
        userId: user.value.id,
        organizationId: org.value.id,
        roles: ["member", "treasurer"],
      });
      if (!membership.ok) throw new Error("setup failed");

      const result = service.removeRole(membership.value.id, "treasurer");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.roles).toEqual(["member"]);
      }
    });
  });
});
