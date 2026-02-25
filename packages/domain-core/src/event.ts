import type { OrgId } from "./ids";

export type ClubEventId = string & { readonly __brand: "ClubEventId" };
export type EventRSVPId = string & { readonly __brand: "EventRSVPId" };

export function clubEventId(id: string): ClubEventId {
  return id as ClubEventId;
}
export function eventRSVPId(id: string): EventRSVPId {
  return id as EventRSVPId;
}

export type EventStatus = "draft" | "published" | "canceled";
export type RSVPStatus = "going" | "waitlist" | "canceled";

export interface ClubEvent {
  id: ClubEventId;
  organizationId: OrgId;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  capacity: number | null;
  status: EventStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  canceledAt: string | null;
  version: number;
}

export interface EventRSVP {
  id: EventRSVPId;
  organizationId: OrgId;
  eventId: ClubEventId;
  userId: string;
  status: RSVPStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}
