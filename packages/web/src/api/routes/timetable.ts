import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { and, eq } from "drizzle-orm";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const app = new Hono();
app.use("*", requireAuth);

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function slotInput(body: any) {
  const classId = validId(body.classId);
  const day = String(body.day || "");
  const period = Number(body.period);
  const subject = String(body.subject || "").trim();
  const teacherId = body.teacherId === null || body.teacherId === undefined || body.teacherId === ""
    ? null
    : validId(body.teacherId);
  const startTime = body.startTime ? String(body.startTime).trim() : null;
  const endTime = body.endTime ? String(body.endTime).trim() : null;

  if (!classId || !DAYS.includes(day as any) || !Number.isInteger(period) || period < 1 || period > 8) return null;
  if (!subject || subject.length > 160) return null;
  if (body.teacherId !== null && body.teacherId !== undefined && body.teacherId !== "" && !teacherId) return null;
  if (startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) return null;
  if (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) return null;
  if (startTime && endTime && startTime >= endTime) return null;

  return { classId, day, period, subject, teacherId, startTime, endTime };
}

async function validateSlotReferences(input: NonNullable<ReturnType<typeof slotInput>>) {
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, input.classId));
  if (!cls) return { message: "Class not found", status: 404 as const };

  if (input.teacherId) {
    const [teacher] = await db.select().from(schema.staff).where(eq(schema.staff.id, input.teacherId));
    if (!teacher) return { message: "Teacher not found", status: 404 as const };
    if (teacher.status !== "active" || teacher.designation !== "Teacher") {
      return { message: "Timetable teacher must be an active teacher staff member", status: 400 as const };
    }
  }

  return null;
}

async function conflictFor(input: NonNullable<ReturnType<typeof slotInput>>, excludeId?: number) {
  const slots = await db.select().from(schema.timetableSlots);

  const classConflict = slots.find((slot) =>
    slot.id !== excludeId &&
    slot.classId === input.classId &&
    slot.day === input.day &&
    slot.period === input.period
  );
  if (classConflict) return "This class already has a timetable entry for the selected day and period";

  if (input.teacherId) {
    const teacherConflict = slots.find((slot) =>
      slot.id !== excludeId &&
      slot.teacherId === input.teacherId &&
      slot.day === input.day &&
      slot.period === input.period
    );
    if (teacherConflict) return "This teacher is already assigned to another class in the selected period";
  }

  return null;
}

app.get("/", async (c) => {
  const user = c.get("user")!;
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  const role = profile?.role ?? "teacher";

  const classIdParam = c.req.query("classId");
  const filterClassId = classIdParam ? validId(classIdParam) : null;
  if (classIdParam && !filterClassId) return c.json({ message: "Invalid classId" }, 400);

  const rows = await db.select().from(schema.timetableSlots);
  const staff = await db.select().from(schema.staff);
  const teacherNames = new Map(staff.map((member) => [member.id, member.name]));

  const enrichedRows = rows.map((row) => ({
    ...row,
    teacherName: row.teacherId ? teacherNames.get(row.teacherId) ?? null : null,
  }));

  let filtered = filterClassId ? enrichedRows.filter((row) => row.classId === filterClassId) : enrichedRows;

  if (role === "admin" || role === "principal") {
    return c.json(filtered, 200);
  }

  const classes = await db.select().from(schema.classes);
  const myClassIds = classes.filter((cls) => cls.teacherUserId === user.id).map((cls) => cls.id);
  filtered = filtered.filter((row) => myClassIds.includes(row.classId));
  return c.json(filtered, 200);
});

app.post("/", requireAdminOrPrincipal, async (c) => {
  const input = slotInput(await c.req.json());
  if (!input) return c.json({ message: "Valid class, weekday, period, subject, teacher, and times are required" }, 400);

  const referenceError = await validateSlotReferences(input);
  if (referenceError) return c.json({ message: referenceError.message }, referenceError.status);

  const conflict = await conflictFor(input);
  if (conflict) return c.json({ message: conflict }, 409);

  const [row] = await db.insert(schema.timetableSlots).values(input).returning();
  return c.json({ slot: row }, 201);
});

app.put("/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid timetable slot id" }, 400);

  const [existing] = await db.select().from(schema.timetableSlots).where(eq(schema.timetableSlots.id, id));
  if (!existing) return c.json({ message: "Timetable slot not found" }, 404);

  const body = await c.req.json();
  const input = slotInput({
    classId: body.classId ?? existing.classId,
    day: body.day ?? existing.day,
    period: body.period ?? existing.period,
    subject: body.subject ?? existing.subject,
    teacherId: body.teacherId !== undefined ? body.teacherId : existing.teacherId,
    startTime: body.startTime !== undefined ? body.startTime : existing.startTime,
    endTime: body.endTime !== undefined ? body.endTime : existing.endTime,
  });
  if (!input) return c.json({ message: "Valid class, weekday, period, subject, teacher, and times are required" }, 400);

  const referenceError = await validateSlotReferences(input);
  if (referenceError) return c.json({ message: referenceError.message }, referenceError.status);

  const conflict = await conflictFor(input, id);
  if (conflict) return c.json({ message: conflict }, 409);

  const [row] = await db.update(schema.timetableSlots).set(input).where(eq(schema.timetableSlots.id, id)).returning();
  return c.json({ slot: row }, 200);
});

app.delete("/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid timetable slot id" }, 400);

  const [existing] = await db.select().from(schema.timetableSlots).where(eq(schema.timetableSlots.id, id));
  if (!existing) return c.json({ message: "Timetable slot not found" }, 404);

  await db.delete(schema.timetableSlots).where(eq(schema.timetableSlots.id, id));
  return c.json({ success: true }, 200);
});

export default app;
