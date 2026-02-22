import type { ModuleManifest } from "./index";

export class ModuleRegistry {
  private modules = new Map<string, ModuleManifest>();

  register(manifest: ModuleManifest): void {
    if (this.modules.has(manifest.name)) {
      throw new Error(`Module '${manifest.name}' is already registered`);
    }
    this.modules.set(manifest.name, manifest);
  }

  get(name: string): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  list(): ModuleManifest[] {
    return Array.from(this.modules.values());
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }
}
