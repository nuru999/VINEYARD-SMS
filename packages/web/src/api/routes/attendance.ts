import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((c) => c.teacherUserId === userId).map((c) => c.id);
}

function sanitizeAttendanceRecord(record: any) {
  const { id: _id, createdAt: _createdAt, ...safeRecord } = record;
  return safeRecord;
}

export const attendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    let data = await db.select().from(schema.attendance);

    // Teachers may only read attendance from classes assigned to them.
    if (role !== "admin" && role !== "principal") {
      const myClassIds = await teacherClassIds(user.id);
      data = data.filter((a) => myClassIds.includes(a.classId));
    }

    // Optional filters used by Teacher Dashboard, Reports, and targeted views.
    const date = c.req.query("date");
    const classIdParam = c.req.query("classId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    if (date) data = data.filter((a) => a.date === date);
    if (classIdParam) {
      const classId = Number(classIdParam);
      if (!Number.isInteger(classId)) return c.json({ message: "Invalid classId" }, 400);
      data = data.filter((a) => a.classId === classId);
    }
    if (startDate) data = data.filter((a) => a.date >= startDate);
    if (endDate) data = data.filter((a) => a.date <= endDate);

    return c.json({ attendance: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const body = await c.req.json();
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) return c.json({ attendance: [] }, 201);

    for (const item of items) {
      if (!Number.isInteger(Number(item.classId)) || !Number.isInteger(Number(item.studentId)) || !item.date || !item.status) {
        return c.json({ message: "Each attendance record requires studentId, classId, date, and status" }, 400);
      }
    }

    // A teacher may only write attendance for their own assigned class(es).
    if (role === "teacher") {
      const myClassIds = await teacherClassIds(user.id);
      if (items.some((item: any) => !myClassIds.includes(Number(item.classId)))) {
        return c.json({ message: "Forbidden: attendance is outside your assigned class" }, 403);
      }
    }

    if (Array.isArray(body)) {
      const classId = Number(items[0].classId);
      const date = String(items[0].date);

      // Bulk saves represent one class on one date. Reject mixed payloads rather
      // than deleting one group and accidentally inserting records for another.
      if (items.some((item: any) => Number(item.classId) !== classId || String(item.date) !== date)) {
        return c.json({ message: "Bulk attendance must contain one class and one date" }, 400);
      }

      await db.delete(schema.attendance).where(
        and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, date))
      );
      const records = await db.insert(schema.attendance).values(items.map(sanitizeAttendanceRecord)).returning();
      return c.json({ attendance: records }, 201);
    }

    const recordInput = sanitizeAttendanceRecord(items[0]);
    const studentId = Number(recordInput.studentId);
    const classId = Number(recordInput.classId);
    const date = String(recordInput.date);

    await db.delete(schema.attendance).where(
      and(
        eq(schema.attendance.studentId, studentId),
        eq(schema.attendance.classId, classId),
        eq(schema.attendance.date, date)
      )
    );
    const [record] = await db.insert(schema.attendance).values(recordInput).returning();
    return c.json({ attendance: record }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) return c.json({ message: "Forbidden" }, 403);

    const id = parseInt(c.req.param("id"));
    const [existing] = await db.select().from(schema.attendance).where(eq(schema.attendance.id, id));
    if (!existing) return c.json({ message: "Attendance record not found" }, 404);

    const body = await c.req.json();
    const safePayload = sanitizeAttendanceRecord(body);
    const targetClassId = Number(safePayload.classId ?? existing.classId);

    if (role === "teacher") {
      const myClassIds = await teacherClassIds(user.id);
      if (!myClassIds.includes(existing.classId) || !myClassIds.includes(targetClassId)) {
        return c.json({ message: "Forbidden: attendance is outside your assigned class" }, 403);
      }
    }

    const [record] = await db.update(schema.attendance).set(safePayload).where(eq(schema.attendance.id, id)).returning();
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
    if (Array.isArray(body)) {
      const records = await db.insert(schema.staffAttendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    const [record] = await db.insert(schema.staffAttendance).values(body).returning();
    return c.json({ attendance: record }, 201);
  });
