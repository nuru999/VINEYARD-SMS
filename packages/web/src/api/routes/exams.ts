import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const ACADEMIC_ROLES = ["admin", "principal", "teacher"];

function roleOf(userId: string) {
  return db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).then(r => r[0]?.role ?? "teacher");
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((cl) => cl.teacherUserId === userId).map((cl) => cl.id);
}

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim();
  return text.slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function gradeFromPercent(pct: number) {
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

function parseExamInput(body: any) {
  const name = cleanText(body?.name, 120);
  const classId = Number(body?.classId);
  const term = optionalText(body?.term, 50);
  const year = body?.year === "" || body?.year === null || body?.year === undefined ? null : Number(body.year);
  const startDate = optionalText(body?.startDate, 10);
  const endDate = optionalText(body?.endDate, 10);

  if (!name) return { error: "Exam name is required" } as const;
  if (!Number.isInteger(classId) || classId <= 0) return { error: "Valid classId is required" } as const;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    return { error: "Year must be between 1900 and 2100" } as const;
  }
  if (startDate && !validIsoDate(startDate)) return { error: "startDate must be a valid YYYY-MM-DD date" } as const;
  if (endDate && !validIsoDate(endDate)) return { error: "endDate must be a valid YYYY-MM-DD date" } as const;
  if (startDate && endDate && endDate < startDate) return { error: "End date cannot be before start date" } as const;

  return { value: { name, classId, term, year, startDate, endDate } } as const;
}

async function validateResultPayload(userId: string, role: string, item: any) {
  const examId = Number(item?.examId);
  const studentId = Number(item?.studentId);
  const subjectId = Number(item?.subjectId);
  const marks = Number(item?.marks);
  const maxMarks = item?.maxMarks === "" || item?.maxMarks === null || item?.maxMarks === undefined
    ? 100
    : Number(item.maxMarks);

  if (![examId, studentId, subjectId].every((value) => Number.isInteger(value) && value > 0)) {
    return { error: "Valid examId, studentId, and subjectId are required", status: 400 as const };
  }
  if (!Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 10000) {
    return { error: "maxMarks must be greater than 0 and no more than 10000", status: 400 as const };
  }
  if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
    return { error: `Marks must be between 0 and ${maxMarks}`, status: 400 as const };
  }

  const [[exam], [student], [subject]] = await Promise.all([
    db.select().from(schema.exams).where(eq(schema.exams.id, examId)),
    db.select().from(schema.students).where(eq(schema.students.id, studentId)),
    db.select().from(schema.subjects).where(eq(schema.subjects.id, subjectId)),
  ]);

  if (!exam) return { error: "Exam not found", status: 404 as const };
  if (!student) return { error: "Student not found", status: 404 as const };
  if (!subject) return { error: "Subject not found", status: 404 as const };
  if (student.classId !== exam.classId || subject.classId !== exam.classId) {
    return { error: "Exam, student, and subject must belong to the same class", status: 400 as const };
  }

  if (role === "teacher") {
    const classIds = await teacherClassIds(userId);
    if (!classIds.includes(exam.classId)) {
      return { error: "Forbidden: result is outside your assigned class", status: 403 as const };
    }
  }

  const percentage = Math.round((marks / maxMarks) * 100);
  return {
    value: {
      examId,
      studentId,
      subjectId,
      marks,
      maxMarks,
      grade: gradeFromPercent(percentage),
      remarks: optionalText(item?.remarks, 500),
    },
  };
}

export const examsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!ACADEMIC_ROLES.includes(role)) return c.json({ message: "Forbidden" }, 403);

    const exams = await db.select().from(schema.exams);
    if (role === "admin" || role === "principal") return c.json({ exams }, 200);

    const myClassIds = await teacherClassIds(user.id);
    return c.json({ exams: exams.filter((exam) => myClassIds.includes(exam.classId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const parsed = parseExamInput(await c.req.json());
    if ("error" in parsed) return c.json({ message: parsed.error }, 400);

    const [targetClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, parsed.value.classId));
    if (!targetClass) return c.json({ message: "Selected class not found" }, 404);

    const existing = await db.select().from(schema.exams);
    const duplicate = existing.find((exam) =>
      exam.classId === parsed.value.classId &&
      exam.name.trim().toLowerCase() === parsed.value.name.toLowerCase() &&
      (exam.term ?? null) === parsed.value.term &&
      (exam.year ?? null) === parsed.value.year
    );
    if (duplicate) return c.json({ message: "An exam with the same name, class, term, and year already exists" }, 409);

    const [exam] = await db.insert(schema.exams).values(parsed.value).returning();
    return c.json({ exam }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid exam id" }, 400);
    const [existingExam] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
    if (!existingExam) return c.json({ message: "Exam not found" }, 404);

    const parsed = parseExamInput(await c.req.json());
    if ("error" in parsed) return c.json({ message: parsed.error }, 400);

    const [targetClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, parsed.value.classId));
    if (!targetClass) return c.json({ message: "Selected class not found" }, 404);

    if (existingExam.classId !== parsed.value.classId) {
      const linkedResults = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, id));
      if (linkedResults.length) {
        return c.json({ message: "Cannot move an exam to another class after results have been entered" }, 409);
      }
    }

    const allExams = await db.select().from(schema.exams);
    const duplicate = allExams.find((exam) =>
      exam.id !== id &&
      exam.classId === parsed.value.classId &&
      exam.name.trim().toLowerCase() === parsed.value.name.toLowerCase() &&
      (exam.term ?? null) === parsed.value.term &&
      (exam.year ?? null) === parsed.value.year
    );
    if (duplicate) return c.json({ message: "An exam with the same name, class, term, and year already exists" }, 409);

    const [exam] = await db.update(schema.exams).set(parsed.value).where(eq(schema.exams.id, id)).returning();
    return c.json({ exam }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid exam id" }, 400);
    const [exam] = await db.select().from(schema.exams).where(eq(schema.exams.id, id));
    if (!exam) return c.json({ message: "Exam not found" }, 404);

    const linkedResults = await db.select().from(schema.examResults).where(eq(schema.examResults.examId, id));
    if (linkedResults.length) {
      return c.json({ message: "Cannot delete an exam with results. Keep it for academic history." }, 409);
    }

    await db.delete(schema.exams).where(eq(schema.exams.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const resultsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!ACADEMIC_ROLES.includes(role)) return c.json({ message: "Forbidden" }, 403);

    const results = await db.select().from(schema.examResults);
    if (role === "admin" || role === "principal") return c.json({ results }, 200);

    const myClassIds = await teacherClassIds(user.id);
    const exams = await db.select().from(schema.exams);
    const myExamIds = new Set(exams.filter((exam) => myClassIds.includes(exam.classId)).map((exam) => exam.id));
    return c.json({ results: results.filter((result) => myExamIds.has(result.examId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!ACADEMIC_ROLES.includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const items = Array.isArray(body) ? body : [body];
    if (!items.length) return c.json({ message: "At least one result is required" }, 400);

    const safeItems: any[] = [];
    const payloadKeys = new Set<string>();
    for (const item of items) {
      const validated = await validateResultPayload(user.id, role, item);
      if ("error" in validated) return c.json({ message: validated.error }, validated.status);

      const key = `${validated.value.examId}:${validated.value.studentId}:${validated.value.subjectId}`;
      if (payloadKeys.has(key)) return c.json({ message: "Duplicate result for the same exam, student, and subject in one request" }, 409);
      payloadKeys.add(key);
      safeItems.push(validated.value);
    }

    const upserted = [];
    for (const safeItem of safeItems) {
      const [existing] = await db.select().from(schema.examResults).where(
        and(
          eq(schema.examResults.examId, safeItem.examId),
          eq(schema.examResults.studentId, safeItem.studentId),
          eq(schema.examResults.subjectId, safeItem.subjectId)
        )
      );

      if (existing) {
        const [updated] = await db.update(schema.examResults).set({
          marks: safeItem.marks,
          maxMarks: safeItem.maxMarks,
          grade: safeItem.grade,
          remarks: safeItem.remarks,
        }).where(eq(schema.examResults.id, existing.id)).returning();
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
    if (!ACADEMIC_ROLES.includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid result id" }, 400);
    const [existing] = await db.select().from(schema.examResults).where(eq(schema.examResults.id, id));
    if (!existing) return c.json({ message: "Result not found" }, 404);

    const body = await c.req.json();
    for (const field of ["examId", "studentId", "subjectId"] as const) {
      if (body?.[field] !== undefined && Number(body[field]) !== existing[field]) {
        return c.json({ message: "Result exam/student/subject cannot be changed. Save a result for the new target instead." }, 400);
      }
    }

    const validated = await validateResultPayload(user.id, role, {
      ...existing,
      marks: body?.marks ?? existing.marks,
      maxMarks: body?.maxMarks ?? existing.maxMarks,
      remarks: body?.remarks ?? existing.remarks,
    });
    if ("error" in validated) return c.json({ message: validated.error }, validated.status);

    const [result] = await db.update(schema.examResults).set({
      marks: validated.value.marks,
      maxMarks: validated.value.maxMarks,
      grade: validated.value.grade,
      remarks: validated.value.remarks,
    }).where(eq(schema.examResults.id, id)).returning();
    return c.json({ result }, 200);
  });
