import { Hono } from "hono";
import { loadModules } from "./kernel/module-loader";

const app = new Hono();

loadModules(app);

export default app;
