export interface ModuleManifest {
  name: string;
  version: string;
  displayName: string;
  capabilities: string[];
}

export function validateModuleManifest(manifest: ModuleManifest): ModuleManifest {
  if (!manifest.name || !manifest.version) {
    throw new Error("Invalid module manifest");
  }

  return manifest;
}
