export * from "./tokens";
export * from "./blocks/registry";
export { BlockRenderer } from "./blocks/BlockRenderer";
export * from "./primitives";
export { PAGE_TEMPLATES, getTemplate } from "./templates";
export type { PageTemplate } from "./templates";

// Side-effect: register all block definitions
import "./blocks/definitions";
