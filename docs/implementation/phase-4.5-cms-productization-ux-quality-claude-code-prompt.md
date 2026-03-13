# Phase 4.5 Prompt (Claude Code): CMS Productization + UX Quality Pass

Implement **Phase 4.5: CMS Productization + UX Quality Pass** in the `club-os` repository root as an additive phase inserted between current Phase 4 and Phase 5.

## Roadmap Constraint (non-negotiable)
- **Do not renumber or rewrite the existing Phase 5+ roadmap.**
- Treat this as an additive bridge (`Phase 4.5` / `UX-1`) that productizes the platform and upgrades CMS + navigation + design system quality.
- Existing Phase 5+ plans remain intact.

## Why this phase exists
Club OS now has strong backend/domain functionality, but the web UX still has major product gaps:
- users must discover routes manually
- CMS pages exist but navigation/menu integration is incomplete
- `/public` can still show a low-value placeholder landing page
- block-based pages may render functionally but not at a product-quality visual level
- admin CMS authoring UX can feel like a dev tool instead of a webmaster tool

This phase is **not optional polish**. It is a productization phase focused on:
- CMS-driven site IA and navigation
- non-technical webmaster workflows
- component-based content authoring and templates
- default public site seeding (Home/About/Contact)
- visual design quality across public/member/admin shells
- design-system enforcement (no AI-slop / no ad hoc hardcoded pages)

---

## Core Product Principles (must enforce)
1. **Client handoff win**
- A non-technical webmaster can manage pages, menus, and content without code changes.
- Common site updates do not require engineering intervention.

2. **Easy editing and safe authoring**
- Use structured, component-based page authoring (blocks/templates), not one-off hardcoded pages.
- Editing flow must be previewable, intuitive, and robust.

3. **Plugin-capable / extensible CMS**
- Future modules can contribute blocks/widgets/templates via manifests/registries/schemas.
- No one-off UI hacks as the default extension path.

4. **Low-maintenance workflow**
- AI should create/revise reusable components/templates, not generate routine hardcoded tenant pages.
- Menus and page rendering should be data-driven and schema-validated.

5. **Brand consistency enforced by system design**
- Editors compose pages from approved blocks/templates.
- Theme tokens are tenant-configurable; structure and rendering quality are enforced by the design system.
- Avoid AI-slop and generic boilerplate aesthetics.

6. **Club OS remains brand-agnostic**
- Club OS is the platform; branded sites (e.g. Sterling Ski Club) are implementations on top of it.
- Build reusable abstractions and templates, not tenant-specific hardcoded paths or copy.

---

## Inspiration Requirement (SSC POC)
Use design/UX inspiration from the best parts of the existing SSC POC at:
- the sibling `ssc` repository

### Use SSC for inspiration, not copying
- **Do use**: layout rhythm, section composition, CTA hierarchy, shell cohesion, member portal discoverability, booking flow framing, visual polish.
- **Do not use**: SSC-specific content, branding text, tenant-specific data hacks, or hardcoded SSC routes as Club OS defaults.

### Mandatory inspection step
Before major UI work, inspect the SSC codebase and/or screenshots. In the final response, explicitly state:
1. what design patterns were borrowed conceptually
2. what was intentionally not copied to preserve platform generality

---

## Read first
- `agent-workbench/global/AGENTS.md`
- `AGENTS.md` (if present)
- Run `agent-workbench/bin/docs-list`
- `docs/implementation/phase-plan.md`
- `docs/implementation/claude-execution-checklist.md`
- `docs/implementation/claude-handoff.md`
- `docs/architecture/web-route-map.md`
- `docs/architecture/feature-inventory.md`
- `docs/contracts/module-contracts.md`
- `docs/contracts/module-manifest.schema.json`
- `docs/security/rbac-matrix.md`
- `docs/security/policy-engine-contract.md`

Frontend design requirement (Claude-safe):
- Read and follow `$CODEX_HOME/skills/frontend-design/SKILL.md`
- Do not use `Skill(...)` syntax
- If unavailable, stop and report before UI implementation

---

## Execution Model (strict)
Implement in strict subphases:
- `UX-1A`: Navigation + seeded public pages + homepage resolution + unified shells
- `UX-1B`: Component-based page builder + block registry + webmaster authoring UX
- `UX-1C`: Visual quality pass + template upgrades + admin/editor polish + docs/tests

Complete each subphase fully and run its gate before moving on.
Keep `corepack pnpm check` green and preserve existing Playwright CI compatibility.

---

# UX-1A: Navigation, Seeded Public Pages, and `/public` Homepage Resolution

## Objective
Eliminate manual URL discovery, make `/public` useful by default, and establish CMS-driven navigation.

## Deliverables
### 1. CMS-driven navigation model and API
Implement a menu/navigation system (new module preferred if cleanly separable) with tenant isolation:
- `Menu`
- `MenuItem`
- menu locations/slots (at minimum):
  - `public_header`
  - `public_footer`
  - `member_primary` (or `member_tabbar`)
  - `admin_primary`
- visibility rules (`public`, `member`, `admin`)
- ordering
- nesting (at least one level)
- target types:
  - CMS page
  - internal route
  - external URL (optional but useful)

### 2. Default public site seeding (new requirement)
Club OS should **auto-seed** a baseline public site structure for a new tenant/dev org.
At minimum create these public CMS pages using templates:
- `Home` (`/home`)
- `About Us` (`/about`)
- `Contact` (`/contact`)

Requirements:
- Pages are CMS records, not hardcoded files/routes
- Seeded pages should be **published** with usable template content
- Seeding must be **idempotent** (reruns do not duplicate pages/menu items)
- Seed flow should be safe for dev resets and bootstrap retries

### 3. Default public menu seeding (new requirement)
Auto-seed a default public menu (editable via CMS UI) that includes:
- Home
- About Us
- Contact

Requirements:
- Uses menu data, not hardcoded nav links
- Idempotent seeding
- Menu items linked to seeded CMS pages

### 4. `/public` homepage resolution (new requirement)
The `/public` route should no longer be a generic placeholder once seeded content exists.
Implement `/public` as tenant homepage resolution:
- Preferred: resolve from a site setting (e.g. `homepagePageId`)
- Fallback: published page with slug `home`
- If no homepage exists, render a temporary onboarding fallback with clear next steps (not a fake marketing page)

Requirements:
- `/public` should render or redirect to the actual CMS homepage content
- Avoid duplicate homepage implementations (no separate hardcoded `/public` landing page)

### 5. Unified shells (public/member/admin)
Build or refine consistent shells using shared design system primitives:
- public shell with nav/footer
- member shell with discoverable primary navigation (no URL hunting)
- admin shell with clear ops navigation and capability-aware visibility

## API contracts (baseline)
Use `{ data }` / `{ error, reasonCode? }` envelopes and tenant isolation.
Minimum routes (you may expand):
- `GET /api/navigation/menus/:location`
- `GET /api/admin/navigation/menus`
- `PUT /api/admin/navigation/menus/:location`
- `PATCH /api/admin/navigation/menu-items/:id` (or tree-replace API only, but document choice)
- `DELETE /api/admin/navigation/menu-items/:id`
- Optional seed/bootstrap route or startup seed hook (dev-safe/idempotent)

## Authz and policy constraints
- Public menu reads only expose valid public-visible items and published pages
- Member/admin menu reads respect session/capabilities
- Admin menu management must be capability-gated (`content.write` and/or `settings.manage`; document choice)
- Preserve policy reason-code and audit semantics on `:id` routes (`extractResource` correctness)

## UX-1A tests (must implement)
- API tests: menu CRUD/update, tenant isolation, visibility filtering
- Seed tests: idempotent creation of Home/About/Contact and default menu
- Web tests: `/public` resolves to seeded homepage; nav renders from menu data
- Playwright smoke: homepage and seeded nav are discoverable/clickable without manual URL typing

## UX-1A gate
- `corepack pnpm check`
- Relevant API tests pass
- Existing Playwright route-area tests remain green

---

# UX-1B: Component-Based Page Builder + Webmaster Authoring UX

## Objective
Support non-technical page editing with structured blocks/templates and a safe authoring workflow.

## Deliverables
### 1. Structured page content model (blocks)
Extend content pages to support structured blocks while preserving backward compatibility:
- recommended fields:
  - `contentFormat: "legacy_markdown" | "blocks_v1"`
  - `blocks: Array<PageBlock>` when `blocks_v1`
- Maintain draft/publish semantics for both formats

### 2. Block registry (platform-level, extensible)
Implement a registry for CMS blocks with:
- block type key
- prop schema/validation
- renderer component
- editor form config/component
- version metadata

Requirements:
- safe handling for unknown/invalid blocks (admin-visible warning + public-safe fallback)
- future modules can contribute blocks without patching core rendering logic

### 3. Initial block set (minimum viable but real)
Implement useful blocks for general clubs / ski clubs:
- `hero`
- `rich_text`
- `callout`
- `cta`
- `card_grid`
- `feature_list`
- `two_column`
- `image`
- `faq`
- `stats`
- `section_heading`
- `divider`

Optional data-backed blocks (great if feasible):
- `event_list`
- `announcement_list`
- `booking_cta`

### 4. Starter templates (required)
Provide polished, editable starter templates built from blocks:
- Home / Landing
- About Us
- Lodges / Facilities
- Membership / FAQ
- Contact
- Generic informational page

Templates must be credible defaults, not placeholder-only content.

### 5. Webmaster authoring UX (admin)
Implement a non-technical-friendly CMS editor flow:
- add/reorder/remove blocks
- edit block settings
- preview affordance (preview route/pane)
- draft save + publish
- nav placement controls (`showInMenu`, `menuLocation`, etc.)
- clear status display (draft/published/in-menu)

### 6. Publish-to-menu integration (required)
On publish/edit, support:
- `showInMenu`
- `menuLocation`
- `menuLabel` override
- optional `menuSortOrder`
- optional `menuParentId`

Requirements:
- idempotent menu item linkage (no duplicate menu items on repeated publish)
- editable in CMS UI by non-technical users

## UX-1B tests (must implement)
- API tests for structured page validation + publish behavior
- Web RTL tests for block renderer and editor interactions
- Playwright flow: create/edit/publish a block-based page and surface it in nav
- Regression tests for repeated publish/menu update idempotency

## UX-1B gate
- `corepack pnpm check`
- Playwright content publish/navigation flow passes

---

# UX-1C: Visual Quality Pass + Template/Editor Polish + Docs/Hardening

## Objective
Raise UI/UX quality to a product-grade baseline across public/member/admin/editor surfaces and prevent placeholder-grade output.

## Hard visual acceptance criteria (must pass)
### A. Public shell quality
- polished, responsive header/nav/footer
- clear visual hierarchy (brand, hero, sections, CTAs)
- mobile nav is intentional and usable
- `/public` homepage looks like a real tenant site, not a developer placeholder

### B. Block renderer quality (no placeholder-grade blocks)
- `hero` supports strong visual treatment (image/gradient/overlay and proper CTA styling)
- CTA renders as a real button with hover/focus states
- feature content renders as cards/grid or intentional layout, not plain stacked rows
- rich text has real typography rhythm and spacing
- sections have intentional spacing/background transitions

### C. Template quality (production-ready defaults)
These templates must look credible out of the box:
- Home / Landing
- About Us
- Lodges / Facilities
- Membership / FAQ
- Contact

### D. Admin CMS editor UX quality (webmaster-first)
The editor must feel like a product tool, not a dev form:
- clear grouping (page settings vs content blocks vs publishing)
- strong block hierarchy and controls
- prominent preview and publish actions
- helpful empty states / inline guidance
- improved scannability and information density

### E. Member shell quality
- clear discoverable navigation
- productized framing for key routes (bookings, events, community, docs, profile)
- reduced “URL-driven” feel

### F. No AI-slop / generic boilerplate
Reject outputs that rely on:
- flat generic cards everywhere with weak hierarchy
- random gradients with no structure
- poor spacing rhythm
- default typography with no scale system
- placeholder copy treated as final UX

## Implementation guidance (recommended)
1. Refine design system tokens/primitives first
2. Upgrade block renderers to use improved primitives
3. Upgrade templates using those blocks and variants
4. Polish admin editor UX and shell structure
5. Perform responsive QA pass (desktop/tablet/mobile)

## Design system enforcement (critical)
- CMS blocks must render through approved design-system primitives
- Theme tokens remain tenant-configurable, but rendering quality and structure remain consistent
- Avoid per-page arbitrary styling as the default path

## Docs and plan updates (required)
Create/update docs describing:
- navigation/menu model and seeded defaults
- `/public` homepage resolution behavior
- block registry and template strategy
- webmaster workflow (draft/publish/menu placement)
- plugin/block contribution pattern
- design system vs theme responsibilities

Recommended docs:
- `docs/architecture/cms-navigation-and-menus.md`
- `docs/architecture/cms-block-registry-and-page-builder.md`

Also update:
- `docs/implementation/phase-plan.md` to include Phase 4.5 (additive, no renumbering of Phase 5+)
- relevant handoff/checklist docs
- `CHANGELOG.md` with accurate entries and test counts

## Visual QA evidence (required in final response)
Provide:
- before/after summary for public, member, and admin CMS editor surfaces
- which blocks/templates were visually upgraded
- how SSC inspiration influenced the result conceptually
- what was intentionally not copied to preserve platform generality

## UX-1C tests (must implement)
- Playwright e2e for webmaster flow:
  1. create page from template/block builder
  2. publish page
  3. place in public menu
  4. verify page appears in nav and is reachable without manual URL typing
  5. verify `/public` resolves to seeded homepage / configured homepage
- RTL tests for nav rendering and key shell states
- Existing Phase 2/3/4 flows remain green
- Visual regression/screenshot checks for key templates/editor if feasible (strongly recommended)

## UX-1C gate (final)
Run and report:
- `corepack pnpm install`
- `corepack pnpm check`
- `corepack pnpm test:web:e2e:install`
- `corepack pnpm test:web:e2e`

---

## Non-goals (this phase)
- Full enterprise WYSIWYG parity
- Arbitrary custom CSS injection by editors
- Replacing all existing module UIs if not touched by this phase
- Tenant-specific SSC logic in Club OS core

---

## Architecture Constraints (must preserve)
- API authz remains source of truth; UI guards are UX-only
- Tenant isolation on pages, menus, and editor actions
- Policy reason-code and audit semantics preserved on `:id` routes
- Module manifests schema-compliant for any new modules
- Data-driven navigation and CMS rendering preferred over hardcoded route links
- Backward compatibility for existing content pages preserved or clearly migrated/documented
- No reintroduction of hardcoded `/public` placeholder when seeded homepage exists

---

## Definition of Done
Phase 4.5 is complete when:
- Club OS seeds a usable public site (Home/About/Contact + default menu) idempotently
- `/public` resolves to the actual CMS homepage (not a generic placeholder)
- New pages can be surfaced in nav through CMS UI controls
- Block-based page builder and templates support non-technical webmaster workflows
- Public/member/admin/editor surfaces are product-grade and no longer placeholder-looking
- Club OS remains brand-agnostic, plugin-capable, and client-handoff-friendly
- `corepack pnpm check` passes
- Playwright flows pass (or blockers documented clearly)

---

## Final Response Format for Claude
Return:
1. Scope completed by `UX-1A`, `UX-1B`, `UX-1C`
2. API routes/modules added or changed
3. Web routes/screens changed
4. CMS model changes (menus, seeded pages, homepage resolution, blocks/templates)
5. Design system changes and visual-quality improvements
6. SSC inspiration mapping (concepts borrowed vs intentionally not copied)
7. Docs added/updated
8. Test results (`pnpm check`, Playwright, visual checks if added)
9. Risks/tradeoffs and deferred items
