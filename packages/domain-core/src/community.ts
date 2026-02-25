import type { OrgId } from "./ids";

export type CommunityPostId = string & {
  readonly __brand: "CommunityPostId";
};
export type CommunityCommentId = string & {
  readonly __brand: "CommunityCommentId";
};
export type CommunityReportId = string & {
  readonly __brand: "CommunityReportId";
};

export function communityPostId(id: string): CommunityPostId {
  return id as CommunityPostId;
}
export function communityCommentId(id: string): CommunityCommentId {
  return id as CommunityCommentId;
}
export function communityReportId(id: string): CommunityReportId {
  return id as CommunityReportId;
}

export type ModerationStatus = "visible" | "hidden" | "locked" | "deleted";
export type ReportTargetType = "post" | "comment";
export type ReportStatus = "open" | "triaged" | "resolved" | "dismissed";
export type ReportReasonCode =
  | "spam"
  | "abuse"
  | "harassment"
  | "unsafe"
  | "other";

export interface CommunityPost {
  id: CommunityPostId;
  organizationId: OrgId;
  authorUserId: string;
  title: string;
  body: string;
  tags: string[];
  status: ModerationStatus;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CommunityComment {
  id: CommunityCommentId;
  organizationId: OrgId;
  postId: CommunityPostId;
  authorUserId: string;
  body: string;
  status: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CommunityReport {
  id: CommunityReportId;
  organizationId: OrgId;
  targetType: ReportTargetType;
  targetId: string;
  reportedByUserId: string;
  reasonCode: ReportReasonCode;
  details: string | null;
  status: ReportStatus;
  resolutionNotes: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
