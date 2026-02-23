import type { MembershipId, UserId, OrgId } from "./ids";
import type { TenantRoleName } from "./user";

export type MembershipStatus = "active" | "suspended" | "cancelled";

export interface Membership {
  id: MembershipId;
  userId: UserId;
  organizationId: OrgId;
  roles: TenantRoleName[];
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
}
