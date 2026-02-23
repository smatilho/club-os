import type {
  User,
  Organization,
  Membership,
  TenantRoleName,
  UserId,
  OrgId,
  MembershipId,
} from "@club-os/domain-core";
import { userId, orgId, membershipId, ok, err, type Result } from "@club-os/domain-core";

/**
 * In-memory identity store for Phase 1.
 * Will be replaced by DatabasePort adapter in Phase 2+.
 */
export class IdentityService {
  private users = new Map<string, User>();
  private organizations = new Map<string, Organization>();
  private memberships = new Map<string, Membership>();

  reset(): void {
    this.users.clear();
    this.organizations.clear();
    this.memberships.clear();
  }

  // --- Users ---

  createUser(input: {
    email: string;
    displayName: string;
  }): Result<User, string> {
    const existing = [...this.users.values()].find(
      (u) => u.email === input.email,
    );
    if (existing) {
      return err("User with this email already exists");
    }

    const now = new Date().toISOString();
    const user: User = {
      id: userId(crypto.randomUUID()),
      email: input.email,
      displayName: input.displayName,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return ok(user);
  }

  getUser(id: UserId): Result<User, string> {
    const user = this.users.get(id);
    return user ? ok(user) : err("User not found");
  }

  getUserByEmail(email: string): Result<User, string> {
    const user = [...this.users.values()].find((u) => u.email === email);
    return user ? ok(user) : err("User not found");
  }

  // --- Organizations ---

  createOrganization(input: {
    slug: string;
    name: string;
    timezone: string;
  }): Result<Organization, string> {
    const existing = [...this.organizations.values()].find(
      (o) => o.slug === input.slug,
    );
    if (existing) {
      return err("Organization with this slug already exists");
    }

    const now = new Date().toISOString();
    const org: Organization = {
      id: orgId(crypto.randomUUID()),
      slug: input.slug,
      name: input.name,
      timezone: input.timezone,
      createdAt: now,
      updatedAt: now,
    };
    this.organizations.set(org.id, org);
    return ok(org);
  }

  getOrganization(id: OrgId): Result<Organization, string> {
    const org = this.organizations.get(id);
    return org ? ok(org) : err("Organization not found");
  }

  // --- Memberships ---

  createMembership(input: {
    userId: UserId;
    organizationId: OrgId;
    roles: TenantRoleName[];
  }): Result<Membership, string> {
    // Verify user and org exist
    if (!this.users.has(input.userId)) {
      return err("User not found");
    }
    if (!this.organizations.has(input.organizationId)) {
      return err("Organization not found");
    }

    // Check for duplicate membership
    const existing = [...this.memberships.values()].find(
      (m) =>
        m.userId === input.userId &&
        m.organizationId === input.organizationId &&
        m.status === "active",
    );
    if (existing) {
      return err("Active membership already exists for this user and organization");
    }

    const now = new Date().toISOString();
    const membership: Membership = {
      id: membershipId(crypto.randomUUID()),
      userId: input.userId,
      organizationId: input.organizationId,
      roles: input.roles,
      status: "active",
      joinedAt: now,
      updatedAt: now,
    };
    this.memberships.set(membership.id, membership);
    return ok(membership);
  }

  getMembership(id: MembershipId): Result<Membership, string> {
    const membership = this.memberships.get(id);
    return membership ? ok(membership) : err("Membership not found");
  }

  /**
   * List memberships for a user, scoped to an organization.
   * Enforces tenant isolation: only returns memberships for the given org.
   */
  listMembershipsForUser(
    targetUserId: UserId,
    organizationId: OrgId,
  ): Membership[] {
    return [...this.memberships.values()].filter(
      (m) =>
        m.userId === targetUserId && m.organizationId === organizationId,
    );
  }

  /**
   * List all memberships in an organization.
   * Scoped by organizationId for tenant isolation.
   */
  listMembershipsForOrg(organizationId: OrgId): Membership[] {
    return [...this.memberships.values()].filter(
      (m) => m.organizationId === organizationId,
    );
  }

  /**
   * Assign a role to a membership.
   */
  assignRole(
    membershipIdValue: MembershipId,
    role: TenantRoleName,
  ): Result<Membership, string> {
    const membership = this.memberships.get(membershipIdValue);
    if (!membership) {
      return err("Membership not found");
    }
    if (membership.roles.includes(role)) {
      return err("Role already assigned");
    }

    const updated: Membership = {
      ...membership,
      roles: [...membership.roles, role],
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(updated.id, updated);
    return ok(updated);
  }

  /**
   * Remove a role from a membership.
   */
  removeRole(
    membershipIdValue: MembershipId,
    role: TenantRoleName,
  ): Result<Membership, string> {
    const membership = this.memberships.get(membershipIdValue);
    if (!membership) {
      return err("Membership not found");
    }
    if (!membership.roles.includes(role)) {
      return err("Role not assigned");
    }

    const updated: Membership = {
      ...membership,
      roles: membership.roles.filter((r) => r !== role),
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(updated.id, updated);
    return ok(updated);
  }
}
