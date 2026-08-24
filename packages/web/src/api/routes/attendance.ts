import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const ATTENDANCE_STATUSES = ["present", "absent", "late", "leave"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((c) => c.teacherUserId === userId).map((c) => c.id);
}

function attendanceInput(record: any) {
  const studentId = validId(record.studentId);
  const classId = validId(record.classId);
  const date = String(record.date || "");
  const status = String(record.status || "").toLowerCase();

  if (!studentId || !classId || !validDate(date) || !ATTENDANCE_STATUSES.includes(status as any)) return null;
  return { studentId, classId, date, status };
}

async function validateStudentClass(studentId: number, classId: number) {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student) return "Student not found";
  if (student.classId !== classId) return "Student does not belong to the selected class";
  return null;
}

function staffAttendanceInput(record: any) {
  const staffId = validId(record.staffId);
  const date = String(record.date || "");
  const status = String(record.status || "").toLowerCase();
  if (!staffId || !validDate(date) || !ATTENDANCE_STATUSES.includes(status as any)) return null;
  return { staffId, date, status };
}

export const attendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    let data = await db.select().from(schema.attendance);

    if (role !== "admin" && role !== "principal") {
      const myClassIds = await teacherClassIds(user.id);
      data = data.filter((record) => myClassIds.includes(record.classId));
    }

    const date = c.req.query("date");
    const classIdParam = c.req.query("classId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    if (date && !validDate(date)) return c.json({ message: "Invalid date" }, 400);
    if (startDate && !validDate(startDate)) return c.json({ message: "Invalid start date" }, 400);
    if (endDate && !validDate(endDate)) return c.json({ message: "Invalid end date" }, 400);
    if (startDate && endDate && startDate > endDate) return c.json({ message: "Start date cannot be after end date" }, 400);

    if (date) data = data.filter((record) => record.date === date);
    if (classIdParam) {
      const classId = validId(classIdParam);
      if (!classId) return c.json({ message: "Invalid classId" }, 400);
      data = data.filter((record) => record.classId === classId);
    }
    if (startDate) data = data.filter((record) => record.date >= startDate);
    if (endDate) data = data.filter((record) => record.date <= endDate);

    return c.json({ attendance: data }, 200);
  })

  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const rawItems = Array.isArray(body) ? body : [body];
    if (rawItems.length === 0) return c.json({ attendance: [] }, 201);

    const items = rawItems.map(attendanceInput);
    if (items.some((item) => !item)) {
      return c.json({ message: "Each attendance record requires a valid student, class, date, and status" }, 400);
    }
    const safeItems = items as NonNullable<ReturnType<typeof attendanceInput>>[];

    if (role === "teacher") {
      const myClassIds = await teacherClassIds(user.id);
      if (safeItems.some((item) => !myClassIds.includes(item.classId))) {
        return c.json({ message: "Forbidden: attendance is outside your assigned class" }, 403);
      }
    }

    const studentRows = await db.select().from(schema.students);
    const studentMap = new Map(studentRows.map((student) => [student.id, student]));
    for (const item of safeItems) {
      const student = studentMap.get(item.studentId);
      if (!student) return c.json({ message: `Student #${item.studentId} not found` }, 404);
      if (student.classId !== item.classId) {
        return c.json({ message: `${student.name} does not belong to the selected class` }, 400);
      }
    }

    if (Array.isArray(body)) {
      const classId = safeItems[0].classId;
      const date = safeItems[0].date;
      if (safeItems.some((item) => item.classId !== classId || item.date !== date)) {
        return c.json({ message: "Bulk attendance must contain one class and one date" }, 400);
      }

      const seen = new Set<number>();
      for (const item of safeItems) {
        if (seen.has(item.studentId)) return c.json({ message: "A student cannot appear twice in the same attendance save" }, 400);
        seen.add(item.studentId);
      }

      await db.delete(schema.attendance).where(
        and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, date))
      );
      const records = await db.insert(schema.attendance).values(safeItems).returning();
      return c.json({ attendance: records }, 201);
    }

    const input = safeItems[0];
    await db.delete(schema.attendance).where(
      and(
        eq(schema.attendance.studentId, input.studentId),
        eq(schema.attendance.classId, input.classId),
        eq(schema.attendance.date, input.date)
      )
    );
    const [record] = await db.insert(schema.attendance).values(input).returning();
    return c.json({ attendance: record }, 201);
  })

  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid attendance id" }, 400);

    const [existing] = await db.select().from(schema.attendance).where(eq(schema.attendance.id, id));
    if (!existing) return c.json({ message: "Attendance record not found" }, 404);

    const body = await c.req.json();
    const input = attendanceInput({
      studentId: body.studentId ?? existing.studentId,
      classId: body.classId ?? existing.classId,
      date: body.date ?? existing.date,
      status: body.status ?? existing.status,
    });
    if (!input) return c.json({ message: "Valid student, class, date, and status are required" }, 400);

    if (role === "teacher") {
      const myClassIds = await teacherClassIds(user.id);
      if (!myClassIds.includes(existing.classId) || !myClassIds.includes(input.classId)) {
        return c.json({ message: "Forbidden: attendance is outside your assigned class" }, 403);
      }
    }

    const placementError = await validateStudentClass(input.studentId, input.classId);
    if (placementError) return c.json({ message: placementError }, placementError === "Student not found" ? 404 : 400);

    const duplicate = await db.select().from(schema.attendance).where(
      and(
        eq(schema.attendance.studentId, input.studentId),
        eq(schema.attendance.classId, input.classId),
        eq(schema.attendance.date, input.date)
      )
    );
    if (duplicate.some((record) => record.id !== id)) {
      return c.json({ message: "Attendance already exists for this student, class, and date" }, 409);
    }

    const [record] = await db.update(schema.attendance).set(input).where(eq(schema.attendance.id, id)).returning();
    return c.json({ attendance: record }, 200);
  });

export const staffAttendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const data = await db.select().from(schema.staffAttendance);
    return c.json({ attendance: data }, 200);
  })

  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const rawItems = Array.isArray(body) ? body : [body];
    if (rawItems.length === 0) return c.json({ attendance: [] }, 201);

    const items = rawItems.map(staffAttendanceInput);
    if (items.some((item) => !item)) {
      return c.json({ message: "Each staff attendance record requires valid staff, date, and status" }, 400);
    }
    const safeItems = items as NonNullable<ReturnType<typeof staffAttendanceInput>>[];
    const staffRows = await db.select().from(schema.staff);
    const validStaffIds = new Set(staffRows.map((member) => member.id));
    if (safeItems.some((item) => !validStaffIds.has(item.staffId))) {
      return c.json({ message: "Staff member not found" }, 404);
    }

    if (Array.isArray(body)) {
      const date = safeItems[0].date;
      if (safeItems.some((item) => item.date !== date)) {
        return c.json({ message: "Bulk staff attendance must contain one date" }, 400);
      }
      const seen = new Set<number>();
      for (const item of safeItems) {
        if (seen.has(item.staffId)) return c.json({ message: "A staff member cannot appear twice in the same attendance save" }, 400);
        seen.add(item.staffId);
      }

      await db.delete(schema.staffAttendance).where(eq(schema.staffAttendance.date, date));
      const records = await db.insert(schema.staffAttendance).values(safeItems).returning();
      return c.json({ attendance: records }, 201);
    }

    const input = safeItems[0];
    await db.delete(schema.staffAttendance).where(
      and(eq(schema.staffAttendance.staffId, input.staffId), eq(schema.staffAttendance.date, input.date))
    );
    const [record] = await db.insert(schema.staffAttendance).values(input).returning();
    return c.json({ attendance: record }, 201);
  });
