import { serve } from "@hono/node-server";
import app from "./index";
import { getApiRuntimeConfig } from "./kernel/runtime-config";

const runtimeConfig = getApiRuntimeConfig();
const port = runtimeConfig.port;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@club-os/api listening on http://localhost:${info.port}`);
});
