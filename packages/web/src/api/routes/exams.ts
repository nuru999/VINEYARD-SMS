import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

function roleOf(userId: string) {
  return db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).then(r => r[0]?.role ?? "teacher");
}

export const examsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const exams = await db.select().from(schema.exams);
    if (role === "admin" || role === "principal") return c.json({ exams }, 200);

    const classes = await db.select().from(schema.classes);
    const myClassIds = classes.filter((cl) => cl.teacherUserId === user.id).map((cl) => cl.id);
    return c.json({ exams: exams.filter((e) => myClassIds.includes(e.classId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const body = await c.req.json();
    const [exam] = await db.insert(schema.exams).values(body).returning();
    return c.json({ exam }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [exam] = await db.update(schema.exams).set(body).where(eq(schema.exams.id, id)).returning();
    return c.json({ exam }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.exams).where(eq(schema.exams.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const resultsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const results = await db.select().from(schema.examResults);
    if (role === "admin" || role === "principal") return c.json({ results }, 200);

    const classes = await db.select().from(schema.classes);
    const myClassIds = classes.filter((cl) => cl.teacherUserId === user.id).map((cl) => cl.id);
    const exams = await db.select().from(schema.exams);
    const myExamIds = exams.filter((e) => myClassIds.includes(e.classId)).map((e) => e.id);
    const subjects = await db.select().from(schema.subjects);
    const mySubjectIds = subjects.filter((s) => myClassIds.includes(s.classId)).map((s) => s.id);
    return c.json({ results: results.filter((r) => myExamIds.includes(r.examId) && mySubjectIds.includes(r.subjectId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const results = await db.insert(schema.examResults).values(body).returning();
      return c.json({ results }, 201);
    }
    const [result] = await db.insert(schema.examResults).values(body).returning();
    return c.json({ result }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [result] = await db.update(schema.examResults).set(body).where(eq(schema.examResults.id, id)).returning();
    return c.json({ result }, 200);
  });
