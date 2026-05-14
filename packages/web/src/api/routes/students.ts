import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const students = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.students);
    return c.json({ students: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [student] = await db.insert(schema.students).values(body).returning();
    return c.json({ student }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Not found" }, 404);
    return c.json({ student }, 200);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [student] = await db.update(schema.students).set(body).where(eq(schema.students.id, id)).returning();
    return c.json({ student }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.students).where(eq(schema.students.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
