import { Hono } from "hono";
import { db } from "../database";
import { inventoryItems } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

app.get("/", async (c) => {
  const rows = await db.select().from(inventoryItems);
  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(inventoryItems).values(body).returning();
  return c.json(row, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { id: _id, createdAt, ...safePayload } = body;
  const [row] = await db.update(inventoryItems).set(safePayload).where(eq(inventoryItems.id, id)).returning();
  return c.json(row);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  return c.json({ success: true });
});

export default app;
