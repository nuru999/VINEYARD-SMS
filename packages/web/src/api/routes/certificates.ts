import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
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
    const type = String(body.type || "");
    if (!Number.isInteger(studentId) || studentId <= 0 || !CERTIFICATE_TYPES.includes(type as any) || !body.issuedDate) {
      return c.json({ message: "Student, certificate type, and issue date are required" }, 400);
    }

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ message: "Student not found" }, 404);
    if (!(await canAccessStudent(user.id, role, studentId))) {
      return c.json({ message: "Forbidden: student is outside your assigned class" }, 403);
    }

    const [issuer] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
    const [cert] = await db.insert(schema.certificates).values({
      studentId,
      type,
      issuedDate: String(body.issuedDate),
      issuedBy: issuer?.id ?? null,
      notes: body.notes || null,
    }).returning();
    return c.json({ certificate: cert }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = parseInt(c.req.param("id"));
    const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id));
    if (!cert) return c.json({ message: "Not found" }, 404);
    if (!(await canAccessStudent(user.id, role, cert.studentId))) return c.json({ message: "Forbidden" }, 403);
    return c.json({ certificate: cert }, 200);
  })
  // Official certificate deletion is limited to school leadership.
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = parseInt(c.req.param("id"));
    const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id));
    if (!cert) return c.json({ message: "Not found" }, 404);
    await db.delete(schema.certificates).where(eq(schema.certificates.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
