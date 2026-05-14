/**
 * Production server — serves Hono API + static React build
 * Used on Railway / any Node-compatible host
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import app from "./src/api/index";

const PORT = Number(process.env.PORT) || 3000;

const server = new Hono();

// API routes
server.route("/", app);

// Serve static files from the built frontend
server.use(
  "/*",
  serveStatic({ root: "./dist" })
);

// SPA fallback — all non-API routes serve index.html
server.get("/*", serveStatic({ path: "./dist/index.html" }));

serve({ fetch: server.fetch, port: PORT }, () => {
  console.log(`✅ Vineyard School running on port ${PORT}`);
});
