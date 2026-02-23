# Public Content Caching & Invalidation

## Phase 2 Implementation

### Fetch Caching Mode

**Mode**: `no-store` (correctness-first)

All server-side fetches from the web app to the API use `cache: "no-store"`. This ensures:
- Public content always reflects the latest published state
- Theme changes are immediately visible
- No stale data risk during development or testing

### Why Correctness-First

- Phase 2 uses in-memory storage — data is ephemeral, so caching adds complexity without benefit
- Draft/publish workflow means content changes are intentional management actions, not high-frequency
- Public traffic is not yet at a scale where caching is a performance concern

### Publish Invalidation Behavior

- **Current**: No cache to invalidate. Every public page request fetches fresh from the API.
- The publish action updates the in-memory store immediately, so the next public request sees the new content.

### Tenant Resolution (Phase 2 Interim Strategy)

Public endpoints use a hardcoded dev default org (`org-default`). This is documented in:
- `services/api/src/modules/content/routes.ts` (content module)
- `services/api/src/modules/org-profile/routes.ts` (theme module)

Both modules accept a `defaultOrgId` option that can be overridden in tests and future tenant resolution middleware.

### Phase 3/5 Optimization Plan

1. **Add revalidation**: Switch to `next.revalidate` with a time-based TTL (e.g., 60s) for public content and theme fetches.
2. **On-demand invalidation**: When content is published or theme is updated, call `revalidatePath()` or `revalidateTag()` from a webhook/event handler.
3. **Tenant resolution**: Replace dev default org with subdomain-based or host-header-based org resolution middleware.
4. **CDN layer**: Add `Cache-Control` headers to API responses for published content and theme (e.g., `public, max-age=60, stale-while-revalidate=300`).
5. **Persistent storage**: Move from in-memory to database-backed storage, making caching a real performance optimization rather than correctness concern.
