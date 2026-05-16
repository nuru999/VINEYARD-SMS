import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const classesRoutes = new Hono()
  // Anyone authenticated can read classes
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.classes);
    // Join teacher name for each class
    const staffList = await db.select().from(schema.staff);
    const enriched = data.map((cls) => ({
      ...cls,
      teacherName: cls.teacherId
        ? staffList.find((s) => s.id === cls.teacherId)?.name ?? null
        : null,
    }));
    return c.json({ classes: enriched }, 200);
  })
  // ADMIN ONLY — create class
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [cls] = await db.insert(schema.classes).values(body).returning();
    return c.json({ class: cls }, 201);
  })
  // ADMIN ONLY — update class (including assign teacher)
  .put("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [cls] = await db
      .update(schema.classes)
      .set(body)
      .where(eq(schema.classes.id, id))
      .returning();
    return c.json({ class: cls }, 200);
  })
  // ADMIN ONLY — delete class
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.classes).where(eq(schema.classes.id, id));
    return c.json({ message: "Deleted" }, 200);
  })
  // ADMIN ONLY — assign teacher to class
  .post("/:id/assign-teacher", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const { teacherId } = await c.req.json();
    const [cls] = await db
      .update(schema.classes)
      .set({ teacherId: teacherId ?? null })
      .where(eq(schema.classes.id, id))
      .returning();
    return c.json({ class: cls }, 200);
  });

export const sectionsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.sections);
    return c.json({ sections: data }, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [sec] = await db.insert(schema.sections).values(body).returning();
    return c.json({ section: sec }, 201);
  })
  .put("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [sec] = await db
      .update(schema.sections)
      .set(body)
      .where(eq(schema.sections.id, id))
      .returning();
    return c.json({ section: sec }, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.sections).where(eq(schema.sections.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const subjectsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.subjects);
    return c.json({ subjects: data }, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [sub] = await db.insert(schema.subjects).values(body).returning();
    return c.json({ subject: sub }, 201);
  })
  .put("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [sub] = await db
      .update(schema.subjects)
      .set(body)
      .where(eq(schema.subjects.id, id))
      .returning();
    return c.json({ subject: sub }, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
