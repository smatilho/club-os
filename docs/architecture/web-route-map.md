# Web Route Map

## Route Areas

### /public/* — Public Area
- Purpose: marketing, history, membership funnel, static content, dynamic CMS pages
- Auth: none (public access)
- Layout: public-facing chrome (nav, footer, branding via tenant theme tokens)

### /member/* — Member Area
- Purpose: dues, reservations, social feed, events, account management
- Auth: authenticated member session required
- Layout: member dashboard chrome (sidebar, member nav)

### /admin/* — Management Area
- Purpose: CMS, financial operations, reservation ops, branding settings, admin controls
- Auth: management role required
- Layout: admin dashboard chrome (dark utilitarian theme, admin nav)

## Navigation Model
- Root `/` redirects to `/public`
- Unauthenticated users see public area only
- Authenticated members can access `/member/*` routes
- Management users can access `/admin/*` routes
- Route guards enforce separation at layout level (server-side, UX only — real authz at API boundary)

## Auth Enforcement (Phase 1+)
- `/member/*` layout calls `getSession()` and redirects to `/public` if no session
- `/admin/*` layout calls `getSession()` and redirects to `/public` if no session, `/member` if no management capability
- Admin area UX guard checks management capabilities (for example: `membership.manage`, `settings.read`, `content.publish`)
- Session backed by cookie (`mock-session`) in development; production uses auth provider

## Routes

| Area   | Path                         | Description                          | Phase |
|--------|------------------------------|--------------------------------------|-------|
| public | `/public`                    | Public landing page                  | 0     |
| public | `/public/[...slug]`          | Dynamic CMS content pages            | 2     |
| member | `/member`                    | Member dashboard                     | 0     |
| admin  | `/admin`                     | Admin dashboard                      | 0     |
| admin  | `/admin/content`             | Content page list (CMS)              | 2     |
| admin  | `/admin/content/new`         | Create new content page              | 2     |
| admin  | `/admin/content/[id]`        | Edit content page / publish          | 2     |
| admin  | `/admin/settings/branding`   | Tenant branding/theme settings       | 2     |

## API Routes (Phase 2)

| Method | Path                                  | Auth       | Capability       |
|--------|---------------------------------------|------------|------------------|
| GET    | `/api/content/public/pages/:slugPath` | none       | —                |
| GET    | `/api/content/pages`                  | required   | content.read     |
| GET    | `/api/content/pages/:id`              | required   | content.read     |
| POST   | `/api/content/pages`                  | required   | content.write    |
| PATCH  | `/api/content/pages/:id`              | required   | content.write    |
| POST   | `/api/content/pages/:id/publish`      | required   | content.publish  |
| GET    | `/api/org-profile/public/theme`       | none       | —                |
| GET    | `/api/org-profile/theme`              | required   | settings.read    |
| PUT    | `/api/org-profile/theme`              | required   | settings.manage  |
