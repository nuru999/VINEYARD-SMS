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

export const attendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const data = await db.select().from(schema.attendance);
    if (role === "admin" || role === "principal") return c.json({ attendance: data }, 200);
    const myClassIds = await teacherClassIds(user.id);
    return c.json({ attendance: data.filter((a) => myClassIds.includes(a.classId)) }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal','teacher'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const body = await c.req.json();
    if (Array.isArray(body) && body.length > 0) {
      const { classId, date } = body[0];
      // Upsert: delete existing records for same class + date, then insert fresh
      await db.delete(schema.attendance).where(
        and(eq(schema.attendance.classId, classId), eq(schema.attendance.date, date))
      );
      const records = await db.insert(schema.attendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    if (!Array.isArray(body)) {
      // Single record upsert
      await db.delete(schema.attendance).where(
        and(
          eq(schema.attendance.studentId, body.studentId),
          eq(schema.attendance.classId, body.classId),
          eq(schema.attendance.date, body.date)
        )
      );
      const [record] = await db.insert(schema.attendance).values(body).returning();
      return c.json({ attendance: record }, 201);
    }
    return c.json({ attendance: [] }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal','teacher'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { id: _id, createdAt, ...safePayload } = body;
    const [record] = await db.update(schema.attendance).set(safePayload).where(eq(schema.attendance.id, id)).returning();
    return c.json({ attendance: record }, 200);
  });

export const staffAttendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const data = await db.select().from(schema.staffAttendance);
    return c.json({ attendance: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const records = await db.insert(schema.staffAttendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    const [record] = await db.insert(schema.staffAttendance).values(body).returning();
    return c.json({ attendance: record }, 201);
  });
