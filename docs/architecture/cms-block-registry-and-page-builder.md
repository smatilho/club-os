# CMS Block Registry and Page Builder

## Overview

Club OS supports two content formats for CMS pages:
- **`legacy_markdown`** — Simple text/markdown body (default for existing pages)
- **`blocks_v1`** — Structured block-based content with typed props

## Domain Model

```typescript
type ContentFormat = "legacy_markdown" | "blocks_v1";

interface PageBlock {
  id: string;       // UUID, unique per block instance
  type: string;     // Block type key (e.g., "hero", "rich_text")
  props: Record<string, unknown>;  // Type-specific properties
}
```

Both `ContentPageDraft` and `ContentPagePublished` carry `contentFormat` and `blocks` fields. Existing pages default to `legacy_markdown` with no blocks.

## Block Registry

The block registry lives in `@club-os/ui-kit` and is shared between the API (for validation) and the web app (for rendering).

### Registration

```typescript
interface BlockDefinition {
  type: string;
  displayName: string;
  schema: Record<string, string>;
  defaultProps: Record<string, unknown>;
  editorFields: EditorField[];
}

registerBlock(definition);
getBlockDefinition(type);
getAllBlockDefinitions();
```

### Built-in Block Types (12)

| Type | Display Name | Key Props |
|------|-------------|-----------|
| `hero` | Hero Banner | heading, subheading, ctaText, ctaLink, backgroundImage |
| `rich_text` | Rich Text | content |
| `callout` | Callout | variant (info/success/warning/error), title, content |
| `cta` | Call to Action | heading, description, buttonText, buttonLink |
| `card_grid` | Card Grid | heading, cards (JSON array) |
| `feature_list` | Feature List | heading, features (JSON array) |
| `two_column` | Two Column | leftContent, rightContent |
| `image` | Image | src, alt, caption |
| `faq` | FAQ | heading, items (JSON array) |
| `stats` | Stats | items (JSON array of {value, label}) |
| `section_heading` | Section Heading | heading, subheading |
| `divider` | Divider | style (solid/dashed/dotted) |

### Editor Fields

Each block definition includes `editorFields` that describe the admin UI form:

```typescript
interface EditorField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean" | "color";
  options?: { label: string; value: string }[];
}
```

## Templates

Six pre-built page templates provide starting block configurations:

| Template | Key | Description |
|----------|-----|-------------|
| Home Page | `home` | Hero + features + stats + CTA |
| About Page | `about` | Section heading + rich text + two column + CTA |
| Facilities Page | `facilities` | Hero + card grid + CTA |
| Membership/FAQ | `membership-faq` | Hero + feature list + FAQ + CTA |
| Contact Page | `contact` | Section heading + two column + callout |
| Generic Page | `generic` | Section heading + rich text + divider + CTA |

When a page is created from a template, all block IDs are regenerated with fresh UUIDs via `crypto.randomUUID()`.

## Rendering

### Public Rendering
`BlockRenderer` maps each block to its typed renderer component. Unknown block types are hidden on public pages.

### Admin Preview
The block editor includes a preview toggle that renders blocks inline using `BlockRenderer` with `isAdmin=true`. Unknown blocks show a warning in admin preview.

### Block Editor UI
The admin block editor provides:
- Collapsible block list with type labels and position numbers
- Up/down reorder buttons (no drag-and-drop in current phase)
- Add block picker (3-column grid of available block types)
- Per-block property editing via generated forms from `editorFields`
- Remove block with single click

## API

### Create with blocks
```json
POST /api/content/pages
{
  "title": "My Page",
  "slug": "my-page",
  "body": "",
  "contentFormat": "blocks_v1",
  "blocks": [{ "id": "...", "type": "hero", "props": { "heading": "Welcome" } }]
}
```

### Create from template
```json
POST /api/content/pages
{
  "title": "Home",
  "slug": "home",
  "body": "",
  "templateKey": "home",
  "contentFormat": "blocks_v1"
}
```

### Update blocks
```json
PATCH /api/content/pages/:id
{
  "blocks": [...]
}
```

### Publish
Publishing copies the current `contentFormat` and `blocks` to the published snapshot via `structuredClone`. Post-publish draft edits do not affect the published version.

## Design System

All block renderers use design system primitives from `@club-os/ui-kit`:
- `Container`, `Stack`, `Grid` — Layout
- `Heading`, `Button`, `Card` — Content
- `SectionWrapper`, `Badge`, `Alert` — Structure

All primitives use inline CSS with token constants (spacing, radii, fontSize, fontWeight, fontFamily). No CSS framework dependency.
