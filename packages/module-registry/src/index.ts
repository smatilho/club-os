const schemaVersionPattern = /^1\.[0-9]+$/;
const moduleNamePattern = /^[a-z][a-z0-9-]*$/;
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const dependencyVersionPattern =
  /^[~^]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const ownerPattern = /^[a-zA-Z0-9_.-]+$/;
const capabilityPattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const routePathPattern = /^\/[A-Za-z0-9/_\-[\]().:*]*$/;
const eventNamePattern = /^[a-z][a-z0-9_.-]*$/;

export type ModuleRouteApp = "web" | "api" | "mobile";
export type ModuleRouteArea = "public" | "member" | "admin" | "shared";
export type ModuleRouteVisibility =
  | "public"
  | "authenticated"
  | "management"
  | "internal";

export interface ModuleActivation {
  defaultEnabled: boolean;
  configSchema: string;
}

export interface ModuleRoute {
  app: ModuleRouteApp;
  area: ModuleRouteArea;
  path: string;
  visibility: ModuleRouteVisibility;
}

export interface ModuleDependency {
  module: string;
  version: string;
  optional?: boolean;
}

export interface ModuleEvent {
  name: string;
  direction: "publishes" | "subscribes";
  version: string;
}

export interface ModuleManifest {
  schemaVersion: string;
  name: string;
  version: string;
  displayName: string;
  description: string;
  owner: string;
  activation: ModuleActivation;
  routes: ModuleRoute[];
  capabilities: string[];
  dependencies?: ModuleDependency[];
  events?: ModuleEvent[];
}

function assertNoExtraKeys(
  obj: Record<string, unknown>,
  allowedKeys: readonly string[],
  messagePrefix: string,
): void {
  const extras = Object.keys(obj).filter((key) => !allowedKeys.includes(key));
  if (extras.length > 0) {
    throw new Error(`${messagePrefix} has unknown field(s): ${extras.join(", ")}`);
  }
}

function assertObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message);
  }
  return value;
}

function assertArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}

function assertPattern(value: string, pattern: RegExp, message: string): string {
  if (!pattern.test(value)) {
    throw new Error(message);
  }
  return value;
}

function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  message: string,
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(message);
  }
  return value as T;
}

function validateActivation(value: unknown): ModuleActivation {
  const activation = assertObject(value, "Module manifest requires object 'activation'");
  assertNoExtraKeys(
    activation,
    ["defaultEnabled", "configSchema"],
    "Module manifest 'activation'",
  );
  if (typeof activation.defaultEnabled !== "boolean") {
    throw new Error("Module manifest requires boolean 'activation.defaultEnabled'");
  }
  const configSchema = assertString(
    activation.configSchema,
    "Module manifest requires string 'activation.configSchema'",
  );
  return {
    defaultEnabled: activation.defaultEnabled,
    configSchema,
  };
}

function validateRoutes(value: unknown): ModuleRoute[] {
  const routes = assertArray(value, "Module manifest requires array 'routes'");
  if (routes.length === 0) {
    throw new Error("Module manifest requires at least one route");
  }
  return routes.map((routeValue, index) => {
    const route = assertObject(
      routeValue,
      `Module manifest route at index ${index} must be an object`,
    );
    assertNoExtraKeys(
      route,
      ["app", "area", "path", "visibility"],
      `Module manifest route[${index}]`,
    );
    const app = assertEnum(
      assertString(route.app, `Module manifest route[${index}].app must be a string`),
      ["web", "api", "mobile"],
      `Module manifest route[${index}].app is invalid`,
    );
    const area = assertEnum(
      assertString(route.area, `Module manifest route[${index}].area must be a string`),
      ["public", "member", "admin", "shared"],
      `Module manifest route[${index}].area is invalid`,
    );
    const path = assertPattern(
      assertString(route.path, `Module manifest route[${index}].path must be a string`),
      routePathPattern,
      `Module manifest route[${index}].path is invalid`,
    );
    const visibility = assertEnum(
      assertString(
        route.visibility,
        `Module manifest route[${index}].visibility must be a string`,
      ),
      ["public", "authenticated", "management", "internal"],
      `Module manifest route[${index}].visibility is invalid`,
    );
    return {
      app,
      area,
      path,
      visibility,
    };
  });
}

function assertUniqueArrayItems<T>(
  items: T[],
  keyFor: (item: T) => string,
  message: string,
): void {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (seen.has(key)) {
      throw new Error(message);
    }
    seen.add(key);
  }
}

function validateCapabilities(value: unknown): string[] {
  const capabilities = assertArray(
    value,
    "Module manifest requires array 'capabilities'",
  ).map((entry, index) => {
    const capability = assertString(
      entry,
      `Module manifest capability[${index}] must be a string`,
    );
    return assertPattern(
      capability,
      capabilityPattern,
      `Module manifest capability[${index}] is invalid`,
    );
  });
  if (capabilities.length === 0) {
    throw new Error("Module manifest requires at least one capability");
  }
  assertUniqueArrayItems(
    capabilities,
    (capability) => capability,
    "Module manifest capabilities must be unique",
  );
  return capabilities;
}

function validateDependencies(value: unknown): ModuleDependency[] {
  const dependencies = assertArray(
    value,
    "Module manifest 'dependencies' must be an array when provided",
  );
  return dependencies.map((entry, index) => {
    const dep = assertObject(
      entry,
      `Module manifest dependency[${index}] must be an object`,
    );
    assertNoExtraKeys(
      dep,
      ["module", "version", "optional"],
      `Module manifest dependency[${index}]`,
    );
    const module = assertPattern(
      assertString(dep.module, `Module manifest dependency[${index}].module is required`),
      moduleNamePattern,
      `Module manifest dependency[${index}].module is invalid`,
    );
    const version = assertPattern(
      assertString(
        dep.version,
        `Module manifest dependency[${index}].version is required`,
      ),
      dependencyVersionPattern,
      `Module manifest dependency[${index}].version is invalid`,
    );
    if (dep.optional !== undefined && typeof dep.optional !== "boolean") {
      throw new Error(
        `Module manifest dependency[${index}].optional must be boolean when provided`,
      );
    }
    return {
      module,
      version,
      optional: dep.optional as boolean | undefined,
    };
  });
}

function validateEvents(value: unknown): ModuleEvent[] {
  const events = assertArray(
    value,
    "Module manifest 'events' must be an array when provided",
  );
  return events.map((entry, index) => {
    const event = assertObject(entry, `Module manifest event[${index}] must be an object`);
    assertNoExtraKeys(
      event,
      ["name", "direction", "version"],
      `Module manifest event[${index}]`,
    );
    const name = assertPattern(
      assertString(event.name, `Module manifest event[${index}].name is required`),
      eventNamePattern,
      `Module manifest event[${index}].name is invalid`,
    );
    const direction = assertEnum(
      assertString(
        event.direction,
        `Module manifest event[${index}].direction is required`,
      ),
      ["publishes", "subscribes"],
      `Module manifest event[${index}].direction is invalid`,
    );
    const version = assertPattern(
      assertString(event.version, `Module manifest event[${index}].version is required`),
      semverPattern,
      `Module manifest event[${index}].version is invalid`,
    );
    return {
      name,
      direction,
      version,
    };
  });
}

export function validateModuleManifest(manifest: unknown): ModuleManifest {
  const m = assertObject(manifest, "Module manifest must be an object");
  assertNoExtraKeys(
    m,
    [
      "schemaVersion",
      "name",
      "version",
      "displayName",
      "description",
      "owner",
      "activation",
      "routes",
      "capabilities",
      "dependencies",
      "events",
    ],
    "Module manifest",
  );
  const schemaVersion = assertPattern(
    assertString(m.schemaVersion, "Module manifest requires string 'schemaVersion'"),
    schemaVersionPattern,
    "Module manifest 'schemaVersion' is invalid",
  );
  const name = assertPattern(
    assertString(m.name, "Module manifest requires a non-empty 'name'"),
    moduleNamePattern,
    "Module manifest 'name' is invalid",
  );
  const version = assertPattern(
    assertString(m.version, "Module manifest requires a non-empty 'version'"),
    semverPattern,
    "Module manifest 'version' is invalid",
  );
  const displayName = assertString(
    m.displayName,
    "Module manifest requires a non-empty 'displayName'",
  );
  if (displayName.length < 3) {
    throw new Error("Module manifest 'displayName' must be at least 3 characters");
  }
  const description = assertString(
    m.description,
    "Module manifest requires string 'description'",
  );
  if (description.length < 10) {
    throw new Error("Module manifest 'description' must be at least 10 characters");
  }
  const owner = assertPattern(
    assertString(m.owner, "Module manifest requires string 'owner'"),
    ownerPattern,
    "Module manifest 'owner' is invalid",
  );
  const activation = validateActivation(m.activation);
  const routes = validateRoutes(m.routes);
  assertUniqueArrayItems(
    routes,
    (route) => JSON.stringify(route),
    "Module manifest routes must be unique",
  );
  const capabilities = validateCapabilities(m.capabilities);
  const dependencies =
    m.dependencies === undefined ? undefined : validateDependencies(m.dependencies);
  if (dependencies) {
    assertUniqueArrayItems(
      dependencies,
      (dep) => JSON.stringify(dep),
      "Module manifest dependencies must be unique",
    );
  }
  const events = m.events === undefined ? undefined : validateEvents(m.events);
  if (events) {
    assertUniqueArrayItems(
      events,
      (event) => JSON.stringify(event),
      "Module manifest events must be unique",
    );
  }

  return {
    schemaVersion,
    name,
    version,
    displayName,
    description,
    owner,
    activation,
    routes,
    capabilities,
    dependencies,
    events,
  };
}

export { ModuleRegistry } from "./registry";
