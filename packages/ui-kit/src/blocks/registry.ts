export interface EditorField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "boolean" | "color";
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
}

export interface BlockDefinition {
  type: string;
  displayName: string;
  schema: Record<string, string>;
  defaultProps: Record<string, unknown>;
  editorFields: EditorField[];
}

const registry = new Map<string, BlockDefinition>();

export function registerBlock(definition: BlockDefinition): void {
  registry.set(definition.type, definition);
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return registry.get(type);
}

export function getAllBlockDefinitions(): BlockDefinition[] {
  return [...registry.values()];
}
