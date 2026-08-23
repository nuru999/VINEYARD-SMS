import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

async function roleOf(userId: string) {
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function teacherClassIds(userId: string) {
  const classes = await db.select().from(schema.classes);
  return classes.filter((c) => c.teacherUserId === userId).map((c) => c.id);
}

async function canManageClass(userId: string, role: string, classId: number) {
  if (role === "admin" || role === "principal") return true;
  if (role !== "teacher") return false;
  const myClassIds = await teacherClassIds(userId);
  return myClassIds.includes(classId);
}

export const attendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const data = await db.select().from(schema.attendance);
    if (role === "admin" || role === "principal") {
      return c.json({ attendance: data }, 200);
    }
    const myClassIds = await teacherClassIds(user.id);
    return c.json(
      { attendance: data.filter((a) => myClassIds.includes(a.classId)) },
      200
    );
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const body = await c.req.json();

    if (Array.isArray(body)) {
      if (body.length === 0) {
        return c.json({ message: "Attendance records required" }, 400);
      }

      const classIds = [...new Set(body.map((item) => Number(item.classId)))];
      const dates = [...new Set(body.map((item) => String(item.date ?? "")))];

      if (
        classIds.length !== 1 ||
        dates.length !== 1 ||
        !Number.isInteger(classIds[0]) ||
        classIds[0] <= 0 ||
        !dates[0]
      ) {
        return c.json(
          { message: "Batch attendance must contain one valid classId and one date" },
          400
        );
      }

      const classId = classIds[0];
      const date = dates[0];
      if (!(await canManageClass(user.id, role, classId))) {
        return c.json({ message: "Forbidden: class not assigned to this teacher" }, 403);
      }

      await db.delete(schema.attendance).where(
        and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, date))
      );
      const records = await db.insert(schema.attendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }

    const classId = Number(body.classId);
    if (!Number.isInteger(classId) || classId <= 0 || !body.date || !body.studentId) {
      return c.json({ message: "studentId, classId and date are required" }, 400);
    }

    if (!(await canManageClass(user.id, role, classId))) {
      return c.json({ message: "Forbidden: class not assigned to this teacher" }, 403);
    }

    await db.delete(schema.attendance).where(
      and(
        eq(schema.attendance.studentId, body.studentId),
        eq(schema.attendance.classId, classId),
        eq(schema.attendance.date, body.date)
      )
    );
    const [record] = await db
      .insert(schema.attendance)
      .values({ ...body, classId })
      .returning();
    return c.json({ attendance: record }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal", "teacher"].includes(role)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ message: "Invalid attendance id" }, 400);

    const [existing] = await db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.id, id));
    if (!existing) return c.json({ message: "Attendance record not found" }, 404);

    const body = await c.req.json();
    const targetClassId = body.classId !== undefined ? Number(body.classId) : existing.classId;
    if (!Number.isInteger(targetClassId) || targetClassId <= 0) {
      return c.json({ message: "Invalid classId" }, 400);
    }

    if (!(await canManageClass(user.id, role, targetClassId))) {
      return c.json({ message: "Forbidden: class not assigned to this teacher" }, 403);
    }

    const { id: _id, createdAt, ...safePayload } = body;
    const [record] = await db
      .update(schema.attendance)
      .set({ ...safePayload, classId: targetClassId })
      .where(eq(schema.attendance.id, id))
      .returning();
    return c.json({ attendance: record }, 200);
  });

export const staffAttendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) {
      return c.json({ message: "Forbidden" }, 403);
    }
    const data = await db.select().from(schema.staffAttendance);
    return c.json({ attendance: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!["admin", "principal"].includes(role)) {
      return c.json({ message: "Forbidden" }, 403);
    }
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const records = await db.insert(schema.staffAttendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    const [record] = await db.insert(schema.staffAttendance).values(body).returning();
    return c.json({ attendance: record }, 201);
  });
