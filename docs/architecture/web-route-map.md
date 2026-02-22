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
- Route guards are planned at layout level and are implemented in Phase 1

## Phase 0 Routes

| Area   | Path      | Description                   |
|--------|-----------|-------------------------------|
| public | `/public` | Public landing page           |
| member | `/member` | Member dashboard (placeholder)|
| admin  | `/admin`  | Admin dashboard (placeholder) |
