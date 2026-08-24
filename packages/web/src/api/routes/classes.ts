import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { user as userTable } from "../database/auth-schema";

const LEVELS = ["primary", "secondary"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function classInput(body: any) {
  const name = String(body.name || "").trim();
  const level = String(body.level || "primary");
  if (!name || name.length > 100 || !LEVELS.includes(level as any)) return null;
  return { name, level };
}

function sectionInput(body: any) {
  const classId = validId(body.classId);
  const name = String(body.name || "").trim();
  const teacherId = body.teacherId === null || body.teacherId === undefined || body.teacherId === ""
    ? null
    : validId(body.teacherId);
  if (!classId || !name || name.length > 80) return null;
  if (body.teacherId !== null && body.teacherId !== undefined && body.teacherId !== "" && !teacherId) return null;
  return { classId, name, teacherId };
}

function subjectInput(body: any) {
  const classId = validId(body.classId);
  const name = String(body.name || "").trim();
  const code = body.code ? String(body.code).trim().toUpperCase() : null;
  const teacherId = body.teacherId === null || body.teacherId === undefined || body.teacherId === ""
    ? null
    : validId(body.teacherId);
  if (!classId || !name || name.length > 120 || (code && code.length > 30)) return null;
  if (body.teacherId !== null && body.teacherId !== undefined && body.teacherId !== "" && !teacherId) return null;
  return { classId, name, code, teacherId };
}

async function validateStaffReference(staffId: number | null) {
  if (!staffId) return true;
  const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, staffId));
  return !!member && member.status === "active";
}

async function classHasReferences(classId: number) {
  const checks = await Promise.all([
    db.select({ id: schema.students.id }).from(schema.students).where(eq(schema.students.classId, classId)).limit(1),
    db.select({ id: schema.sections.id }).from(schema.sections).where(eq(schema.sections.classId, classId)).limit(1),
    db.select({ id: schema.subjects.id }).from(schema.subjects).where(eq(schema.subjects.classId, classId)).limit(1),
    db.select({ id: schema.attendance.id }).from(schema.attendance).where(eq(schema.attendance.classId, classId)).limit(1),
    db.select({ id: schema.feeStructures.id }).from(schema.feeStructures).where(eq(schema.feeStructures.classId, classId)).limit(1),
    db.select({ id: schema.exams.id }).from(schema.exams).where(eq(schema.exams.classId, classId)).limit(1),
    db.select({ id: schema.timetableSlots.id }).from(schema.timetableSlots).where(eq(schema.timetableSlots.classId, classId)).limit(1),
    db.select({ id: schema.messages.id }).from(schema.messages).where(
      and(eq(schema.messages.recipientType, "class"), eq(schema.messages.recipientId, classId))
    ).limit(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

export const classesRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.classes);
    const authUsers = await db.select().from(userTable);
    const userMap = new Map(authUsers.map((u: any) => [u.id, u.name]));

    return c.json({
      classes: data.map((cls) => ({
        ...cls,
        teacherName: cls.teacherUserId ? userMap.get(cls.teacherUserId) ?? null : null,
      })),
    }, 200);
  })

  .get("/teachers", requireAdmin, async (c) => {
    const profiles = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.role, "teacher"));
    const authUsers = await db.select().from(userTable);
    const userMap = new Map((authUsers as any[]).map((u) => [u.id, u]));
    const staffRows = await db.select().from(schema.staff);
    const staffByUser = new Map(staffRows.filter((s) => s.userId).map((s) => [s.userId!, s]));

    const teachers = profiles.flatMap((profile) => {
      const authUser = userMap.get(profile.userId) as any;
      const staffMember = staffByUser.get(profile.userId);
      if (!authUser || !staffMember || staffMember.status !== "active") return [];
      return [{ userId: profile.userId, name: authUser.name ?? staffMember.name, email: authUser.email ?? staffMember.email ?? "" }];
    });

    return c.json({ teachers }, 200);
  })

  .post("/", requireAdmin, async (c) => {
    const input = classInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class name and level are required" }, 400);

    const duplicate = (await db.select().from(schema.classes)).find(
      (cls) => cls.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "A class with this name already exists" }, 409);

    const [cls] = await db.insert(schema.classes).values(input).returning();
    return c.json({ class: cls }, 201);
  })

  .put("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid class id" }, 400);

    const [existing] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
    if (!existing) return c.json({ message: "Class not found" }, 404);

    const input = classInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class name and level are required" }, 400);

    const duplicate = (await db.select().from(schema.classes)).find(
      (cls) => cls.id !== id && cls.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "A class with this name already exists" }, 409);

    const [cls] = await db.update(schema.classes).set(input).where(eq(schema.classes.id, id)).returning();
    return c.json({ class: cls }, 200);
  })

  .delete("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid class id" }, 400);

    const [existing] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
    if (!existing) return c.json({ message: "Class not found" }, 404);
    if (await classHasReferences(id)) {
      return c.json({ message: "This class is still referenced by students or school records. Remove or reassign those records before deleting it." }, 409);
    }

    await db.delete(schema.classes).where(eq(schema.classes.id, id));
    return c.json({ message: "Deleted" }, 200);
  })

  .post("/:id/assign-teacher", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid class id" }, 400);

    const [existingClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
    if (!existingClass) return c.json({ message: "Class not found" }, 404);

    const { teacherUserId } = await c.req.json();
    const targetUserId = teacherUserId ? String(teacherUserId) : null;

    if (targetUserId) {
      const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, targetUserId));
      const [authUser] = await db.select().from(userTable).where(eq(userTable.id, targetUserId));
      const [staffMember] = await db.select().from(schema.staff).where(eq(schema.staff.userId, targetUserId));
      if (!profile || profile.role !== "teacher" || !authUser || !staffMember || staffMember.status !== "active") {
        return c.json({ message: "Selected user is not an active teacher" }, 400);
      }

      await db.update(schema.classes)
        .set({ teacherUserId: null })
        .where(eq(schema.classes.teacherUserId, targetUserId));
    }

    const [cls] = await db.update(schema.classes)
      .set({ teacherUserId: targetUserId })
      .where(eq(schema.classes.id, id))
      .returning();
    return c.json({ class: cls }, 200);
  });

export const sectionsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.sections);
    return c.json({ sections: data }, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const input = sectionInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class, section name, and teacher are required" }, 400);

    const [parentClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
    if (!parentClass) return c.json({ message: "Class not found" }, 404);
    if (!(await validateStaffReference(input.teacherId))) return c.json({ message: "Teacher/staff member not found or inactive" }, 400);

    const duplicate = (await db.select().from(schema.sections)).find(
      (section) => section.classId === input.classId && section.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "This section already exists in the selected class" }, 409);

    const [section] = await db.insert(schema.sections).values(input).returning();
    return c.json({ section }, 201);
  })
  .put("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid section id" }, 400);

    const [existing] = await db.select().from(schema.sections).where(eq(schema.sections.id, id));
    if (!existing) return c.json({ message: "Section not found" }, 404);

    const input = sectionInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class, section name, and teacher are required" }, 400);
    const [parentClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
    if (!parentClass) return c.json({ message: "Class not found" }, 404);
    if (!(await validateStaffReference(input.teacherId))) return c.json({ message: "Teacher/staff member not found or inactive" }, 400);

    if (existing.classId !== input.classId) {
      const linkedStudents = await db.select({ id: schema.students.id }).from(schema.students).where(eq(schema.students.sectionId, id)).limit(1);
      if (linkedStudents.length) return c.json({ message: "Cannot move a section to another class while students are assigned to it" }, 409);
    }

    const duplicate = (await db.select().from(schema.sections)).find(
      (section) => section.id !== id && section.classId === input.classId && section.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "This section already exists in the selected class" }, 409);

    const [section] = await db.update(schema.sections).set(input).where(eq(schema.sections.id, id)).returning();
    return c.json({ section }, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid section id" }, 400);

    const [existing] = await db.select().from(schema.sections).where(eq(schema.sections.id, id));
    if (!existing) return c.json({ message: "Section not found" }, 404);
    const linkedStudents = await db.select({ id: schema.students.id }).from(schema.students).where(eq(schema.students.sectionId, id)).limit(1);
    if (linkedStudents.length) return c.json({ message: "This section still has students assigned and cannot be deleted" }, 409);

    await db.delete(schema.sections).where(eq(schema.sections.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const subjectsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.subjects);
    return c.json({ subjects: data }, 200);
  })
  .post("/", requireAdmin, async (c) => {
    const input = subjectInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class, subject name, code, and teacher are required" }, 400);

    const [parentClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
    if (!parentClass) return c.json({ message: "Class not found" }, 404);
    if (!(await validateStaffReference(input.teacherId))) return c.json({ message: "Teacher/staff member not found or inactive" }, 400);

    const duplicate = (await db.select().from(schema.subjects)).find(
      (subject) => subject.classId === input.classId && subject.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "This subject already exists in the selected class" }, 409);

    const [subject] = await db.insert(schema.subjects).values(input).returning();
    return c.json({ subject }, 201);
  })
  .put("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid subject id" }, 400);

    const [existing] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
    if (!existing) return c.json({ message: "Subject not found" }, 404);

    const input = subjectInput(await c.req.json());
    if (!input) return c.json({ message: "Valid class, subject name, code, and teacher are required" }, 400);
    const [parentClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
    if (!parentClass) return c.json({ message: "Class not found" }, 404);
    if (!(await validateStaffReference(input.teacherId))) return c.json({ message: "Teacher/staff member not found or inactive" }, 400);

    if (existing.classId !== input.classId) {
      const results = await db.select({ id: schema.examResults.id }).from(schema.examResults).where(eq(schema.examResults.subjectId, id)).limit(1);
      if (results.length) return c.json({ message: "Cannot move a subject to another class while exam results reference it" }, 409);
    }

    const duplicate = (await db.select().from(schema.subjects)).find(
      (subject) => subject.id !== id && subject.classId === input.classId && subject.name.trim().toLowerCase() === input.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: "This subject already exists in the selected class" }, 409);

    const [subject] = await db.update(schema.subjects).set(input).where(eq(schema.subjects.id, id)).returning();
    return c.json({ subject }, 200);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid subject id" }, 400);

    const [existing] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, id));
    if (!existing) return c.json({ message: "Subject not found" }, 404);
    const results = await db.select({ id: schema.examResults.id }).from(schema.examResults).where(eq(schema.examResults.subjectId, id)).limit(1);
    if (results.length) return c.json({ message: "This subject is referenced by exam results and cannot be deleted" }, 409);

    await db.delete(schema.subjects).where(eq(schema.subjects.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
