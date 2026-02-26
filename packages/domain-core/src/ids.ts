export type OrgId = string & { readonly __brand: "OrgId" };
export type UserId = string & { readonly __brand: "UserId" };
export type MembershipId = string & { readonly __brand: "MembershipId" };
export type ContentPageId = string & { readonly __brand: "ContentPageId" };
export type ResourceUnitId = string & { readonly __brand: "ResourceUnitId" };
export type ReservationHoldId = string & {
  readonly __brand: "ReservationHoldId";
};
export type ReservationId = string & { readonly __brand: "ReservationId" };
export type PaymentTransactionId = string & {
  readonly __brand: "PaymentTransactionId";
};
export type MenuItemId = string & { readonly __brand: "MenuItemId" };

export function orgId(id: string): OrgId {
  return id as OrgId;
}

export function userId(id: string): UserId {
  return id as UserId;
}

export function membershipId(id: string): MembershipId {
  return id as MembershipId;
}

export function contentPageId(id: string): ContentPageId {
  return id as ContentPageId;
}

export function resourceUnitId(id: string): ResourceUnitId {
  return id as ResourceUnitId;
}

export function reservationHoldId(id: string): ReservationHoldId {
  return id as ReservationHoldId;
}

export function reservationId(id: string): ReservationId {
  return id as ReservationId;
}

export function paymentTransactionId(id: string): PaymentTransactionId {
  return id as PaymentTransactionId;
}

export function menuItemId(id: string): MenuItemId {
  return id as MenuItemId;
}
