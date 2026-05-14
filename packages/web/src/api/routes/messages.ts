import { Hono } from "hono";
import { db } from "../database";
import { messages } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

app.get("/", async (c) => {
  const rows = await db.select().from(messages).orderBy(desc(messages.sentAt));
  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(messages).values(body).returning();
  return c.json(row, 201);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(messages).where(eq(messages.id, id));
  return c.json({ success: true });
});

export default app;
