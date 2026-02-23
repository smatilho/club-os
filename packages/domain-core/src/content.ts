import type { ContentPageId, OrgId } from "./ids";

export type ContentPageStatus = "draft" | "published";

export interface ContentPageDraft {
  title: string;
  slug: string;
  body: string;
  updatedAt: string;
}

export interface ContentPagePublished {
  title: string;
  slug: string;
  body: string;
  publishedAt: string;
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
