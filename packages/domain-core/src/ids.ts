export type OrgId = string & { readonly __brand: "OrgId" };
export type UserId = string & { readonly __brand: "UserId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };

export function orgId(id: string): OrgId {
  return id as OrgId;
}

export function userId(id: string): UserId {
  return id as UserId;
}

export function membershipId(id: string): MembershipId {
  return id as MembershipId;
}
