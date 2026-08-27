/**
 * Production server — serves Hono API + static React build
 * Used on Railway / any Node-compatible host
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import app from "./src/api/index";
import { runStartupMigrations } from "./src/api/database/startup-migrations";
import { runRoleCredentialRotation } from "./src/api/lib/role-credential-rotation";
import { runDemoDataOperation } from "./src/api/lib/demo-data";

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

async function startServer() {
  // Apply safe, idempotent schema changes before accepting traffic.
  await runStartupMigrations();

  // Optional one-time production credential rotation. This is a no-op unless
  // ROLE_CREDENTIAL_ROTATION_ID and all role-specific credentials are supplied
  // through the runtime environment. A completed rotation is marked in the DB.
  await runRoleCredentialRotation();

  // Optional reversible sales-demo population/cleanup. The demo seeder records
  // every row it creates so a later clear operation removes demo data only.
  await runDemoDataOperation();

  serve({ fetch: server.fetch, port: PORT }, () => {
    console.log(`✅ Vineyard School running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start Vineyard School", error);
  process.exit(1);
});
