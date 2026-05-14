import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const staffRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.staff);
    return c.json({ staff: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [member] = await db.insert(schema.staff).values(body).returning();
    return c.json({ staff: member }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    if (!member) return c.json({ message: "Not found" }, 404);
    return c.json({ staff: member }, 200);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [member] = await db.update(schema.staff).set(body).where(eq(schema.staff.id, id)).returning();
    return c.json({ staff: member }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.staff).where(eq(schema.staff.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
