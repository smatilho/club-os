# Web Route Map

## Route Areas

### /public/* — Public Area
- Purpose: marketing, history, membership funnel, static content
- Auth: none (public access)
- Layout: public-facing chrome (nav, footer, branding)

### /member/* — Member Area
- Purpose: dues, reservations, social feed, events, account management
- Auth: authenticated member session required
- Layout: member dashboard chrome (sidebar, member nav)

### /admin/* — Management Area
- Purpose: CMS, financial operations, reservation ops, admin controls
- Auth: management role required
- Layout: admin dashboard chrome (admin sidebar, admin nav)

## Navigation Model
- Root `/` redirects to `/public`
- Unauthenticated users see public area only
- Authenticated members can access `/member/*` routes
- Management users can access `/admin/*` routes
- Route guards enforce separation at layout level (server-side, UX only — real authz at API boundary)

## Auth Enforcement (Phase 1)
- `/member/*` layout calls `getSession()` and redirects to `/public` if no session
- `/admin/*` layout calls `getSession()` and redirects to `/public` if no session, `/member` if no management capability
- Admin area UX guard checks management capabilities (for example: `membership.manage`, `settings.read`, `content.publish`)
- Session backed by cookie (`mock-session`) in development; production uses auth provider

## Routes

| Area   | Path      | Description                   |
|--------|-----------|-------------------------------|
| public | `/public` | Public landing page           |
| member | `/member` | Member dashboard              |
| admin  | `/admin`  | Admin dashboard               |
