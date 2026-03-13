import type { Hono } from "hono";
import { healthRoutes } from "../modules/health/routes";
import { identityRoutes } from "../modules/identity/routes";
import { contentRoutes } from "../modules/content/routes";
import { orgProfileRoutes } from "../modules/org-profile/routes";
import { reservationRoutes } from "../modules/reservations/routes";
import {
  paymentRoutes,
  processReservationPayment,
} from "../modules/payments/routes";
import { communityRoutes } from "../modules/community/routes";
import { eventRoutes } from "../modules/events/routes";
import {
  notificationRoutes,
  notificationService,
} from "../modules/notifications/routes";
import { navigationRoutes, navigationService } from "../modules/navigation/routes";
import { getApiRuntimeConfig } from "./runtime-config";

export interface ModuleDefinition {
  name: string;
  version: string;
  register: (app: Hono) => void;
}

const runtimeConfig = getApiRuntimeConfig();

const modules: ModuleDefinition[] = [
  {
    name: "health",
    version: "0.1.0",
    register: healthRoutes,
  },
  {
    name: "identity",
    version: "0.1.0",
    register: identityRoutes,
  },
  {
    name: "content",
    version: "0.1.0",
    register: (app: Hono) =>
      contentRoutes(app, {
        navigationService,
        defaultOrgId: runtimeConfig.defaultOrgId,
        autoSeed: runtimeConfig.autoSeed,
      }),
  },
  {
    name: "org-profile",
    version: "0.1.0",
    register: (app: Hono) =>
      orgProfileRoutes(app, {
        defaultOrgId: runtimeConfig.defaultOrgId,
      }),
  },
  {
    name: "reservations",
    version: "0.1.0",
    register: (app: Hono) =>
      reservationRoutes(app, {
        paymentHandler: processReservationPayment,
        defaultOrgId: runtimeConfig.defaultOrgId,
      }),
  },
  {
    name: "payments",
    version: "0.1.0",
    register: paymentRoutes,
  },
  {
    name: "community",
    version: "0.1.0",
    register: (app: Hono) =>
      communityRoutes(app, { notificationService }),
  },
  {
    name: "events",
    version: "0.1.0",
    register: (app: Hono) =>
      eventRoutes(app, { notificationService }),
  },
  {
    name: "notifications",
    version: "0.1.0",
    register: notificationRoutes,
  },
  {
    name: "navigation",
    version: "0.1.0",
    register: (app: Hono) =>
      navigationRoutes(app, {
        defaultOrgId: runtimeConfig.defaultOrgId,
      }),
  },
];

export function loadModules(app: Hono): void {
  for (const mod of modules) {
    mod.register(app);
  }
}
