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
  {
    name: "identity",
    version: "0.1.0",
    register: identityRoutes,
  },
  {
    name: "content",
    version: "0.1.0",
    register: contentRoutes,
  },
  {
    name: "org-profile",
    version: "0.1.0",
    register: orgProfileRoutes,
  },
  {
    name: "reservations",
    version: "0.1.0",
    register: (app: Hono) =>
      reservationRoutes(app, { paymentHandler: processReservationPayment }),
  },
  {
    name: "payments",
    version: "0.1.0",
    register: paymentRoutes,
  },
];

export function loadModules(app: Hono): void {
  for (const mod of modules) {
    mod.register(app);
  }
}
