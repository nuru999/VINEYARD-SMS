import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const students = new Hono()
  // GET — admin sees all, teacher sees only their assigned class
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;

    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id));

    const role = profile?.role ?? "teacher";
    const allClasses = await db.select().from(schema.classes);

    if (role === "admin") {
      const allStudents = await db.select().from(schema.students);
      const enriched = allStudents.map((s) => ({
        ...s,
        className: s.classId
          ? allClasses.find((c) => c.id === s.classId)?.name ?? null
          : null,
      }));
      return c.json({ students: enriched }, 200);
    }

    // Teacher: find classes assigned to this user
    const assignedClasses = allClasses.filter(
      (c) => c.teacherUserId === user.id
    );

    if (!assignedClasses.length) {
      return c.json({ students: [] }, 200);
    }

    const classIds = assignedClasses.map((c) => c.id);
    const allStudents = await db.select().from(schema.students);
    const filtered = allStudents
      .filter((s) => s.classId !== null && classIds.includes(s.classId!))
      .map((s) => ({
        ...s,
        className: assignedClasses.find((c) => c.id === s.classId)?.name ?? null,
      }));

    return c.json({ students: filtered }, 200);
  })

  // ADMIN ONLY — add student
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [student] = await db.insert(schema.students).values(body).returning();
    return c.json({ student }, 201);
  })

  // GET single student
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user")!;

    const [student] = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Not found" }, 404);

    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id));

    if ((profile?.role ?? "teacher") !== "admin") {
      // Verify teacher owns this student's class
      const allClasses = await db.select().from(schema.classes);
      const assignedIds = allClasses
        .filter((c) => c.teacherUserId === user.id)
        .map((c) => c.id);

      if (!student.classId || !assignedIds.includes(student.classId)) {
        return c.json({ message: "Forbidden" }, 403);
      }
    }

    const allClasses = await db.select().from(schema.classes);
    const cls = allClasses.find((c) => c.id === student.classId);

    return c.json(
      { student: { ...student, className: cls?.name ?? null } },
      200
    );
  })

  // GET student full profile — fees + attendance + class
  .get("/:id/profile", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user")!;

    const [student] = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Not found" }, 404);

    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id));

    const role = profile?.role ?? "teacher";
    const allClasses = await db.select().from(schema.classes);

    if (role !== "admin") {
      const assignedIds = allClasses
        .filter((c) => c.teacherUserId === user.id)
        .map((c) => c.id);
      if (!student.classId || !assignedIds.includes(student.classId)) {
        return c.json({ message: "Forbidden" }, 403);
      }
    }

    const cls = allClasses.find((c) => c.id === student.classId) ?? null;

    // Fee payments for this student
    const payments = await db
      .select()
      .from(schema.feePayments)
      .where(eq(schema.feePayments.studentId, id));

    const feeStructures = await db.select().from(schema.feeStructures);

    const totalPaid = payments.reduce((s, p) => s + (p.paidAmount ?? 0), 0);
    const totalBalance = payments.reduce((s, p) => s + (p.balance ?? 0), 0);
    const totalAmount = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

    // Attendance for this student
    const attendanceRecords = await db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.studentId, id));

    const attendanceSummary = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === "present").length,
      absent: attendanceRecords.filter((a) => a.status === "absent").length,
      late: attendanceRecords.filter((a) => a.status === "late").length,
      leave: attendanceRecords.filter((a) => a.status === "leave").length,
    };

    return c.json({
      student: { ...student, className: cls?.name ?? null },
      class: cls,
      payments: payments.map((p) => ({
        ...p,
        feeStructureName: feeStructures.find((f) => f.id === p.feeStructureId)?.name ?? null,
      })),
      feeSummary: { totalPaid, totalBalance, totalAmount, count: payments.length },
      attendanceSummary,
      attendanceRecords,
    }, 200);
  })

  // ADMIN ONLY — edit student
  .put("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [student] = await db
      .update(schema.students)
      .set(body)
      .where(eq(schema.students.id, id))
      .returning();
    return c.json({ student }, 200);
  })

  // ADMIN ONLY — delete student
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.students).where(eq(schema.students.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
