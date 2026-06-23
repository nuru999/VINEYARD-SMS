import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
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
    const { id: _id, createdAt, ...safePayload } = body;
    const [exam] = await db.update(schema.exams).set(safePayload).where(eq(schema.exams.id, id)).returning();
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
      // Upsert each result: update if (examId, studentId, subjectId) exists, else insert
      const upserted = [];
      for (const item of body) {
        const [existing] = await db.select().from(schema.examResults).where(
          and(
            eq(schema.examResults.examId, item.examId),
            eq(schema.examResults.studentId, item.studentId),
            eq(schema.examResults.subjectId, item.subjectId)
          )
        );
        if (existing) {
          const [updated] = await db.update(schema.examResults).set(item)
            .where(eq(schema.examResults.id, existing.id)).returning();
          upserted.push(updated);
        } else {
          const [inserted] = await db.insert(schema.examResults).values(item).returning();
          upserted.push(inserted);
        }
      }
      return c.json({ results: upserted }, 201);
    }
    // Single result upsert
    const [existing] = await db.select().from(schema.examResults).where(
      and(
        eq(schema.examResults.examId, body.examId),
        eq(schema.examResults.studentId, body.studentId),
        eq(schema.examResults.subjectId, body.subjectId)
      )
    );
    if (existing) {
      const { id: _eid, createdAt: _eca, ...safeBody } = body;
      const [updated] = await db.update(schema.examResults).set(safeBody)
        .where(eq(schema.examResults.id, existing.id)).returning();
      return c.json({ result: updated }, 200);
    }
    const { id: _eid2, createdAt: _eca2, ...safeInsert } = body;
    const [result] = await db.insert(schema.examResults).values(safeInsert).returning();
    return c.json({ result }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { id: _id, createdAt, ...safePayload } = body;
    const [result] = await db.update(schema.examResults).set(safePayload).where(eq(schema.examResults.id, id)).returning();
    return c.json({ result }, 200);
  });
