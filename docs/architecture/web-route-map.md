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
| member | `/member/reservations`       | Member reservation list              | 3     |
| member | `/member/reservations/new`   | New booking (date→select→confirm)    | 3     |
| member | `/member/reservations/[id]`  | Reservation detail                   | 3     |
| admin  | `/admin/reservations`        | Admin reservation list               | 3     |
| admin  | `/admin/reservations/[id]`   | Admin reservation detail + actions   | 3     |
| admin  | `/admin/payments`            | Payment transaction list             | 3     |
| admin  | `/admin/payments/[id]`       | Payment detail + refund              | 3     |
| member | `/member/community`          | Community feed (post list)           | 4     |
| member | `/member/community/new`      | Create new community post            | 4     |
| member | `/member/community/posts/[id]` | Post detail with comments          | 4     |
| member | `/member/events`             | Published events list with RSVP      | 4     |
| member | `/member/events/[id]`        | Event detail + RSVP button           | 4     |
| member | `/member/notifications`      | In-app notifications list            | 4     |
| admin  | `/admin/community/reports`   | Community report list + filter       | 4     |
| admin  | `/admin/community/reports/[id]` | Report detail + moderation actions | 4     |
| admin  | `/admin/events`              | Events management list               | 4     |
| admin  | `/admin/events/new`          | Create new event                     | 4     |
| admin  | `/admin/events/[id]`         | Event detail + publish/cancel        | 4     |
| admin  | `/admin/navigation`          | Navigation menu management           | 4.5   |

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

## API Routes (Phase 3 — Reservations & Payments)

| Method | Path                                              | Auth       | Capability            |
|--------|---------------------------------------------------|------------|-----------------------|
| GET    | `/api/reservations/availability`                  | required   | reservation.read      |
| POST   | `/api/reservations/holds`                         | required   | reservation.read      |
| GET    | `/api/reservations/holds/:id`                     | required   | reservation.read      |
| POST   | `/api/reservations/holds/:id/release`             | required   | reservation.read      |
| GET    | `/api/reservations/my`                            | required   | reservation.read      |
| GET    | `/api/reservations/:id`                           | required   | reservation.read      |
| POST   | `/api/reservations`                               | required   | reservation.read      |
| POST   | `/api/reservations/:id/cancel`                    | required   | reservation.read      |
| GET    | `/api/admin/reservations`                         | required   | reservation.manage    |
| POST   | `/api/admin/reservations/:id/override-confirm`    | required   | reservation.override  |
| POST   | `/api/admin/reservations/override-create`         | required   | reservation.override  |
| GET    | `/api/payments/my`                                | required   | reservation.read      |
| GET    | `/api/payments/transactions/:id`                  | required   | reservation.read      |
| POST   | `/api/payments/webhooks/fake`                     | none       | —                     |
| GET    | `/api/admin/payments`                             | required   | finance.read          |
| POST   | `/api/admin/payments/:id/refund`                  | required   | finance.refund        |
| POST   | `/api/admin/payments/fake/complete`               | required   | reservation.manage    |

## API Routes (Phase 4 — Community + Events + Notifications)

| Method | Path                                              | Auth       | Capability            |
|--------|---------------------------------------------------|------------|-----------------------|
| GET    | `/api/community/posts`                            | required   | community.read        |
| POST   | `/api/community/posts`                            | required   | community.write       |
| GET    | `/api/community/posts/:id`                        | required   | community.read        |
| PATCH  | `/api/community/posts/:id`                        | required   | community.write       |
| GET    | `/api/community/posts/:id/comments`               | required   | community.read        |
| POST   | `/api/community/posts/:id/comments`               | required   | community.comment     |
| POST   | `/api/community/posts/:id/report`                 | required   | community.report      |
| POST   | `/api/community/posts/:id/comments/:commentId/report` | required | community.report   |
| GET    | `/api/admin/community/reports`                    | required   | community.moderate    |
| GET    | `/api/admin/community/reports/:id`                | required   | community.moderate    |
| POST   | `/api/admin/community/reports/:id/triage`         | required   | community.moderate    |
| POST   | `/api/admin/community/reports/:id/resolve`        | required   | community.moderate    |
| POST   | `/api/admin/community/reports/:id/dismiss`        | required   | community.moderate    |
| POST   | `/api/admin/community/posts/:id/hide`             | required   | community.moderate    |
| POST   | `/api/admin/community/posts/:id/unhide`           | required   | community.moderate    |
| POST   | `/api/admin/community/posts/:id/lock`             | required   | community.moderate    |
| POST   | `/api/admin/community/posts/:id/unlock`           | required   | community.moderate    |
| POST   | `/api/admin/community/comments/:id/hide`          | required   | community.moderate    |
| POST   | `/api/admin/community/comments/:id/unhide`        | required   | community.moderate    |
| GET    | `/api/events`                                     | required   | events.read           |
| GET    | `/api/events/:id`                                 | required   | events.read           |
| POST   | `/api/events/:id/rsvp`                            | required   | events.read           |
| POST   | `/api/events/:id/rsvp/cancel`                     | required   | events.read           |
| GET    | `/api/events/my/rsvps`                            | required   | events.read           |
| GET    | `/api/admin/events`                               | required   | events.manage         |
| POST   | `/api/admin/events`                               | required   | events.write          |
| PATCH  | `/api/admin/events/:id`                           | required   | events.write          |
| POST   | `/api/admin/events/:id/publish`                   | required   | events.publish        |
| POST   | `/api/admin/events/:id/cancel`                    | required   | events.manage         |
| GET    | `/api/admin/events/:id/rsvps`                     | required   | events.manage         |
| GET    | `/api/notifications/my`                           | required   | notifications.read    |
| POST   | `/api/notifications/:id/read`                     | required   | notifications.read    |

## API Routes (Phase 4.5 — Navigation + Block CMS)

| Method | Path                                              | Auth       | Capability            |
|--------|---------------------------------------------------|------------|-----------------------|
| GET    | `/api/navigation/menus/:location`                 | none       | —                     |
| GET    | `/api/admin/navigation/menus`                     | required   | navigation.read       |
| GET    | `/api/admin/navigation/menus/:location`           | required   | navigation.read       |
| POST   | `/api/admin/navigation/menu-items`                | required   | navigation.write      |
| PATCH  | `/api/admin/navigation/menu-items/:id`            | required   | navigation.write      |
| DELETE | `/api/admin/navigation/menu-items/:id`            | required   | navigation.write      |
