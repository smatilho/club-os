import type { UserId, OrgId } from "./ids";

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export const TENANT_ROLE_NAMES = [
  "member",
  "reservationist",
  "treasurer",
  "webmaster",
  "org_admin",
] as const;

export type TenantRoleName = (typeof TENANT_ROLE_NAMES)[number];

export type RoleName = TenantRoleName | "platform_admin";

export interface RoleAssignment {
  userId: UserId;
  organizationId: OrgId;
  role: TenantRoleName;
  assignedAt: string;
  assignedBy: UserId;
}
