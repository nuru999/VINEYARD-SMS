import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const attendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const classId = c.req.query("classId");
    const date = c.req.query("date");
    let query = db.select().from(schema.attendance);
    const data = await db.select().from(schema.attendance);
    return c.json({ attendance: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    // body can be array for bulk mark
    if (Array.isArray(body)) {
      const records = await db.insert(schema.attendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    const [record] = await db.insert(schema.attendance).values(body).returning();
    return c.json({ attendance: record }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [record] = await db.update(schema.attendance).set(body).where(eq(schema.attendance.id, id)).returning();
    return c.json({ attendance: record }, 200);
  });

export const staffAttendanceRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.staffAttendance);
    return c.json({ attendance: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    if (Array.isArray(body)) {
      const records = await db.insert(schema.staffAttendance).values(body).returning();
      return c.json({ attendance: records }, 201);
    }
    const [record] = await db.insert(schema.staffAttendance).values(body).returning();
    return c.json({ attendance: record }, 201);
  });
