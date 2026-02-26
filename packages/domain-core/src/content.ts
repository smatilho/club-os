import type { ContentPageId, OrgId } from "./ids";

export type ContentPageStatus = "draft" | "published";

export type ContentFormat = "legacy_markdown" | "blocks_v1";

export interface PageBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface ContentPageDraft {
  title: string;
  slug: string;
  body: string;
  updatedAt: string;
  showInMenu?: boolean;
  menuLocation?: string;
  menuLabel?: string;
  menuSortOrder?: number;
  contentFormat?: ContentFormat;
  blocks?: PageBlock[];
}

export interface ContentPagePublished {
  title: string;
  slug: string;
  body: string;
  publishedAt: string;
  contentFormat?: ContentFormat;
  blocks?: PageBlock[];
}

export interface ContentPage {
  id: ContentPageId;
  organizationId: OrgId;
  status: ContentPageStatus;
  draft: ContentPageDraft;
  published: ContentPagePublished | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
