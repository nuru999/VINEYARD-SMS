import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const CERTIFICATE_TYPES = ["leaving", "character", "bonafide"] as const;

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((cls) => cls.teacherUserId === userId).map((cls) => cls.id);
}

async function canAccessStudent(userId: string, role: string, studentId: number) {
  if (role === "admin" || role === "principal") return true;
  if (role !== "teacher") return false;

  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student?.classId) return false;
  const classIds = await teacherClassIds(userId);
  return classIds.includes(student.classId);
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function sanitizeNotes(value: unknown) {
  const notes = String(value ?? "").trim();
  return notes ? notes.slice(0, 1000) : null;
}

export const certificatesRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    let data = await db.select().from(schema.certificates);
    if (role === "teacher") {
      const classIds = await teacherClassIds(user.id);
      const students = await db.select().from(schema.students);
      const allowedStudentIds = new Set(
        students.filter((student) => student.classId !== null && classIds.includes(student.classId!)).map((student) => student.id)
      );
      data = data.filter((cert) => allowedStudentIds.has(cert.studentId));
    }

    return c.json({ certificates: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const studentId = Number(body.studentId);
    const type = String(body.type || "").trim();
    const issuedDate = String(body.issuedDate || "").trim();

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return c.json({ message: "Valid studentId is required" }, 400);
    }
    if (!CERTIFICATE_TYPES.includes(type as any)) {
      return c.json({ message: "Certificate type must be leaving, character, or bonafide" }, 400);
    }
    if (!validIsoDate(issuedDate)) {
      return c.json({ message: "Issue date must be a valid YYYY-MM-DD date" }, 400);
    }
    if (String(body.notes ?? "").trim().length > 1000) {
      return c.json({ message: "Certificate notes cannot exceed 1000 characters" }, 400);
    }

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ message: "Student not found" }, 404);
    if (!(await canAccessStudent(user.id, role, studentId))) {
      return c.json({ message: "Forbidden: student is outside your assigned class" }, 403);
    }

    const [duplicate] = await db.select().from(schema.certificates).where(
      and(
        eq(schema.certificates.studentId, studentId),
        eq(schema.certificates.type, type),
        eq(schema.certificates.issuedDate, issuedDate)
      )
    );
    if (duplicate) {
      return c.json({ message: "This exact certificate has already been issued for the student on this date" }, 409);
    }

    const [issuer] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
    const [cert] = await db.insert(schema.certificates).values({
      studentId,
      type,
      issuedDate,
      issuedBy: issuer?.id ?? null,
      notes: sanitizeNotes(body.notes),
    }).returning();
    return c.json({ certificate: cert }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid certificate id" }, 400);

    const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id));
    if (!cert) return c.json({ message: "Certificate not found" }, 404);
    if (!(await canAccessStudent(user.id, role, cert.studentId))) return c.json({ message: "Forbidden" }, 403);
    return c.json({ certificate: cert }, 200);
  })
  // Official certificate deletion is limited to school leadership.
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid certificate id" }, 400);

    const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id));
    if (!cert) return c.json({ message: "Certificate not found" }, 404);
    await db.delete(schema.certificates).where(eq(schema.certificates.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
