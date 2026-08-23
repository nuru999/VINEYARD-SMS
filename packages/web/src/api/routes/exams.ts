import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

function roleOf(userId: string) {
  return db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).then(r => r[0]?.role ?? "teacher");
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((cl) => cl.teacherUserId === userId).map((cl) => cl.id);
}

async function canManageResult(userId: string, role: string, item: any) {
  if (role === "admin" || role === "principal") return true;
  if (role !== "teacher") return false;

  const classIds = await teacherClassIds(userId);
  if (!classIds.length) return false;

  const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, item.examId));
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, item.studentId));
  const [subject] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, item.subjectId));

  if (!exam || !student || !subject) return false;

  return (
    classIds.includes(exam.classId) &&
    student.classId === exam.classId &&
    subject.classId === exam.classId
  );
}

export const examsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const exams = await db.select().from(schema.exams);
    if (role === "admin" || role === "principal") return c.json({ exams }, 200);

    const myClassIds = await teacherClassIds(user.id);
    return c.json({ exams: exams.filter((e) => myClassIds.includes(e.classId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const body = await c.req.json();
    const [exam] = await db.insert(schema.exams).values(body).returning();
    return c.json({ exam }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { id: _id, createdAt, ...safePayload } = body;
    const [exam] = await db.update(schema.exams).set(safePayload).where(eq(schema.exams.id, id)).returning();
    return c.json({ exam }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);
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
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const items = Array.isArray(body) ? body : [body];

    for (const item of items) {
      if (!(await canManageResult(user.id, role, item))) {
        return c.json({ message: "Forbidden: result is outside your assigned class" }, 403);
      }
    }

    const upserted = [];
    for (const item of items) {
      const { id: _id, createdAt, ...safeItem } = item;
      const [existing] = await db.select().from(schema.examResults).where(
        and(
          eq(schema.examResults.examId, safeItem.examId),
          eq(schema.examResults.studentId, safeItem.studentId),
          eq(schema.examResults.subjectId, safeItem.subjectId)
        )
      );

      if (existing) {
        const [updated] = await db.update(schema.examResults).set(safeItem)
          .where(eq(schema.examResults.id, existing.id)).returning();
        upserted.push(updated);
      } else {
        const [inserted] = await db.insert(schema.examResults).values(safeItem).returning();
        upserted.push(inserted);
      }
    }

    if (Array.isArray(body)) return c.json({ results: upserted }, 200);
    return c.json({ result: upserted[0] }, 200);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [existing] = await db.select().from(schema.examResults).where(eq(schema.examResults.id, id));
    if (!existing) return c.json({ message: "Result not found" }, 404);

    const candidate = { ...existing, ...body };
    if (!(await canManageResult(user.id, role, candidate))) {
      return c.json({ message: "Forbidden: result is outside your assigned class" }, 403);
    }

    const { id: _id, createdAt, ...safePayload } = body;
    const [result] = await db.update(schema.examResults).set(safePayload).where(eq(schema.examResults.id, id)).returning();
    return c.json({ result }, 200);
  });
