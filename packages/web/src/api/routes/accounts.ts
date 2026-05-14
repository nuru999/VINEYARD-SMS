import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const accountsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.transactions);
    return c.json({ transactions: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [tx] = await db.insert(schema.transactions).values(body).returning();
    return c.json({ transaction: tx }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [tx] = await db.update(schema.transactions).set(body).where(eq(schema.transactions.id, id)).returning();
    return c.json({ transaction: tx }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
