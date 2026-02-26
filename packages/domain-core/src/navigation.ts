import type { ContentPageId, MenuItemId, OrgId } from "./ids";

export type MenuLocation =
  | "public_header"
  | "public_footer"
  | "member_primary"
  | "admin_primary";

export type MenuItemVisibility = "always" | "authenticated" | "unauthenticated";

export type MenuItemLinkType = "internal_page" | "internal_path" | "external";

export interface MenuItem {
  id: MenuItemId;
  organizationId: OrgId;
  location: MenuLocation;
  label: string;
  linkType: MenuItemLinkType;
  linkTarget: string;
  parentId: MenuItemId | null;
  sortOrder: number;
  visibility: MenuItemVisibility;
  contentPageId: ContentPageId | null;
  createdAt: string;
  updatedAt: string;
}
