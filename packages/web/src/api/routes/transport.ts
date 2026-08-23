import { Hono } from "hono";
import { db } from "../database";
import { transportRoutes, transportAssignments } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

app.get("/routes", async (c) => {
  const rows = await db.select().from(transportRoutes);
  return c.json(rows);
});

app.post("/routes", requireAdminOrPrincipal, async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(transportRoutes).values(body).returning();
  return c.json(row, 201);
});

app.put("/routes/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid route id" }, 400);
  const body = await c.req.json();
  const { id: _id, createdAt, ...safePayload } = body;
  const [row] = await db
    .update(transportRoutes)
    .set(safePayload)
    .where(eq(transportRoutes.id, id))
    .returning();
  if (!row) return c.json({ message: "Transport route not found" }, 404);
  return c.json(row);
});

app.delete("/routes/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid route id" }, 400);
  await db.delete(transportRoutes).where(eq(transportRoutes.id, id));
  return c.json({ success: true });
});

app.get("/assignments", async (c) => {
  const rows = await db.select().from(transportAssignments);
  return c.json(rows);
});

app.post("/assignments", requireAdminOrPrincipal, async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(transportAssignments).values(body).returning();
  return c.json(row, 201);
});

app.delete("/assignments/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid assignment id" }, 400);
  await db.delete(transportAssignments).where(eq(transportAssignments.id, id));
  return c.json({ success: true });
});

export default app;
