import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { user as userTable } from "../database/auth-schema";

export const classesRoutes = new Hono()
  // GET — anyone authenticated can read classes (with assigned teacher name)
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.classes);

    const authUsers = await db.select().from(userTable);
    const userMap = new Map(authUsers.map((u: any) => [u.id, u.name]));

    const enriched = data.map((cls) => ({
      ...cls,
      teacherName: cls.teacherUserId ? userMap.get(cls.teacherUserId) ?? null : null,
    }));

    return c.json({ classes: enriched }, 200);
  })

  // GET teachers list — admin only, used by assign-teacher dropdown
  .get("/teachers", requireAdmin, async (c) => {
    const profiles = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.role, "teacher"));

    const authUsers = await db.select().from(userTable);
    const userMap = new Map((authUsers as any[]).map((u) => [u.id, u]));

    const teachers = profiles.map((p) => {
      const u = userMap.get(p.userId) as any;
      return {
        userId: p.userId,
        name: u?.name ?? "Unknown",
        email: u?.email ?? "",
      };
    });

    return c.json({ teachers }, 200);
  })

  // ADMIN ONLY — create class
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [cls] = await db.insert(schema.classes).values(body).returning();
    return c.json({ class: cls }, 201);
  })

  // ADMIN ONLY — update class
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

  // ADMIN ONLY — assign teacher (by userId) to class
  .post("/:id/assign-teacher", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const { teacherUserId } = await c.req.json();
    if (teacherUserId) {
      await db
        .update(schema.classes)
        .set({ teacherUserId: null })
        .where(eq(schema.classes.teacherUserId, teacherUserId));
    }

    const [cls] = await db
      .update(schema.classes)
      .set({ teacherUserId: teacherUserId ?? null })
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
