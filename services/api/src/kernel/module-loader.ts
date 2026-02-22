import type { Hono } from "hono";
import { healthRoutes } from "../modules/health/routes";

export interface ModuleDefinition {
  name: string;
  version: string;
  register: (app: Hono) => void;
}

const modules: ModuleDefinition[] = [
  {
    name: "health",
    version: "0.1.0",
    register: healthRoutes,
  },
];

export function loadModules(app: Hono): void {
  for (const mod of modules) {
    mod.register(app);
  }
}
