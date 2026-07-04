// Production entry: TanStack Start builds a Web-fetch SSR handler
// (`dist/server/server.js`) plus static client assets (`dist/client`), but
// nothing that listens. This wraps them in a Node server — static files first,
// everything else server-rendered.
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import handler from "./dist/server/server.js";

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST || "0.0.0.0";

const app = new Hono();

// Content-hashed Vite assets. A miss calls next(), so real routes fall through.
app.use("/*", serveStatic({ root: "./dist/client" }));

// Every remaining request is server-rendered. `c.req.raw` is the Web Request the
// handler wants; it returns a Web Response Hono forwards as-is.
app.all("/*", (c) => handler.fetch(c.req.raw));

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`web listening on http://${hostname}:${info.port}`);
});
