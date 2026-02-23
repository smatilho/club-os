import { Hono } from "hono";
import { InMemoryAuditWriter } from "@club-os/auth-rbac";
import { loadModules } from "./kernel/module-loader";
import { setAuditWriter } from "./kernel/policy-middleware";

const app = new Hono();
setAuditWriter(new InMemoryAuditWriter());

loadModules(app);

export default app;
