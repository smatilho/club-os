# CMS Navigation and Menus

## Overview

Club OS supports CMS-driven navigation menus that are managed via the admin panel and rendered across public, member, and admin shells. Content pages can be automatically linked to menus on publish.

## Domain Model

### MenuItem

```typescript
interface MenuItem {
  id: MenuItemId;
  organizationId: OrgId;
  location: MenuLocation;
  label: string;
  linkType: MenuItemLinkType;    // "internal_page" | "internal_path" | "external"
  linkTarget: string;             // slug, path, or URL
  parentId: MenuItemId | null;    // one level of nesting supported
  sortOrder: number;
  visibility: MenuItemVisibility; // "always" | "authenticated" | "unauthenticated"
  contentPageId: ContentPageId | null;
  createdAt: string;
  updatedAt: string;
}
```

### MenuLocation

Four menu locations are supported:
- `public_header` — Main navigation bar on the public-facing site
- `public_footer` — Footer links on the public-facing site
- `member_primary` — Member area sidebar/navigation
- `admin_primary` — Admin area sidebar (fallback to hardcoded nav if empty)

## API

### Public (unauthenticated)
- `GET /api/navigation/menus/:location` — Returns menu items filtered by visibility. Items linked to unpublished content pages are excluded.

### Admin (authenticated, `navigation.write` capability)
- `GET /api/admin/navigation/menus` — All items for the organization
- `GET /api/admin/navigation/menus/:location` — Items at a specific location
- `POST /api/admin/navigation/menu-items` — Create menu item
- `PATCH /api/admin/navigation/menu-items/:id` — Update menu item
- `DELETE /api/admin/navigation/menu-items/:id` — Delete (cascades children)

## Content-to-Menu Integration

When a content page is published:
1. If `showInMenu = true` and `menuLocation` is set, the system calls `navigationService.upsertForContentPage()` to create or update a menu item linked to that page.
2. If `showInMenu = false`, any existing menu item linked to the page is removed.

This is a loose coupling via the publish hook in content routes — the content module does not depend on the navigation module at the service layer.

## RBAC

| Role | navigation.read | navigation.write |
|------|----------------|-----------------|
| member | yes | — |
| webmaster | yes | yes |
| org_admin | yes | yes |

## Shell Behavior

Each web shell (public, member, admin) fetches its respective menu location at render time:
- **Public layout** fetches `public_header` and `public_footer`, renders links in header nav and footer.
- **Member layout** fetches `member_primary`, falls back to hardcoded nav items if empty.
- **Admin layout** fetches `admin_primary`, falls back to hardcoded nav items (including Navigation management link) if empty.

## Default Site Seeding

`seedDefaultSite()` creates a baseline public site for a new tenant:
- **Pages**: Home, About Us, Contact — created from templates, published immediately
- **Menu**: `public_header` menu items linking to the seeded pages
- **Idempotent**: safe to call multiple times; skips existing pages/menu items
- **Auto-runs** on server startup for the default org
- **Admin endpoint**: `POST /api/content/seed` (requires `content.publish`)

## Homepage Resolution

The `/public` route resolves the homepage from CMS:
1. Fetches published page with slug `home`
2. If found, renders it (block-based or legacy markdown)
3. If not found, shows an onboarding fallback with a link to the admin dashboard

## Constraints

- Maximum nesting depth: 1 level (parent → child, no grandchildren)
- Sort order auto-increments when not specified
- Tenant isolation enforced on all operations
- Duplicate prevention: same `linkTarget` at the same location is rejected on create
