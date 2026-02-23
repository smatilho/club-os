import { serve } from "@hono/node-server";
import app from "./index";

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`@club-os/api listening on http://localhost:${info.port}`);
});
