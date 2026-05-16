import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, or, like } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const students = new Hono()
  // GET all students — admin sees all, teacher sees only their class
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;

    // Resolve role
    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id));

    const role = profile?.role ?? "teacher";

    if (role === "admin") {
      // Admin: return all students with class name joined
      const allStudents = await db.select().from(schema.students);
      const allClasses = await db.select().from(schema.classes);
      const enriched = allStudents.map((s) => ({
        ...s,
        className: s.classId
          ? allClasses.find((c) => c.id === s.classId)?.name ?? null
          : null,
      }));
      return c.json({ students: enriched }, 200);
    }

    // Teacher: find which class(es) they are assigned to
    const staffRecord = await db
      .select()
      .from(schema.staff)
      .where(eq(schema.staff.userId, user.id));

    if (!staffRecord.length) {
      // Teacher has no staff record yet — return empty
      return c.json({ students: [] }, 200);
    }

    const staffId = staffRecord[0].id;

    // Classes where this teacher is assigned
    const assignedClasses = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.teacherId, staffId));

    if (!assignedClasses.length) {
      return c.json({ students: [] }, 200);
    }

    const classIds = assignedClasses.map((c) => c.id);

    // Get students in those classes
    const allStudents = await db.select().from(schema.students);
    const filtered = allStudents.filter(
      (s) => s.classId !== null && classIds.includes(s.classId)
    );
    const enriched = filtered.map((s) => ({
      ...s,
      className: assignedClasses.find((c) => c.id === s.classId)?.name ?? null,
    }));

    return c.json({ students: enriched }, 200);
  })

  // ADMIN ONLY — add student
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const [student] = await db
      .insert(schema.students)
      .values(body)
      .returning();
    return c.json({ student }, 201);
  })

  // GET single student — admin sees any, teacher only sees their class students
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

    const role = profile?.role ?? "teacher";

    if (role !== "admin") {
      // Teacher: verify student is in their class
      const staffRecord = await db
        .select()
        .from(schema.staff)
        .where(eq(schema.staff.userId, user.id));

      if (!staffRecord.length) return c.json({ message: "Forbidden" }, 403);

      const assignedClasses = await db
        .select()
        .from(schema.classes)
        .where(eq(schema.classes.teacherId, staffRecord[0].id));

      const classIds = assignedClasses.map((c) => c.id);
      if (!student.classId || !classIds.includes(student.classId)) {
        return c.json({ message: "Forbidden" }, 403);
      }
    }

    // Enrich with class name
    const [cls] = student.classId
      ? await db
          .select()
          .from(schema.classes)
          .where(eq(schema.classes.id, student.classId))
      : [null];

    return c.json({ student: { ...student, className: cls?.name ?? null } }, 200);
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
