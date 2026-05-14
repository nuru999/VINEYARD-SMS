import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const examsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.exams);
    return c.json({ exams: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [exam] = await db.insert(schema.exams).values(body).returning();
    return c.json({ exam }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [exam] = await db.update(schema.exams).set(body).where(eq(schema.exams.id, id)).returning();
    return c.json({ exam }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.exams).where(eq(schema.exams.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const resultsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.examResults);
    return c.json({ results: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const results = await db.insert(schema.examResults).values(body).returning();
      return c.json({ results }, 201);
    }
    const [result] = await db.insert(schema.examResults).values(body).returning();
    return c.json({ result }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [result] = await db.update(schema.examResults).set(body).where(eq(schema.examResults.id, id)).returning();
    return c.json({ result }, 200);
  });
