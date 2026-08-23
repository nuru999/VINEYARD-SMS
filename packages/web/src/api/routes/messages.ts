import { Hono } from "hono";
import { db } from "../database";
import { messages, userProfiles, classes, students, staff } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";

const RECIPIENT_TYPES = ["all", "class", "individual"] as const;
const app = new Hono();
app.use("*", requireAuth);

async function roleOf(userId: string) {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function assignedClassIds(userId: string) {
  const rows = await db.select().from(classes);
  return rows.filter((cls) => cls.teacherUserId === userId).map((cls) => cls.id);
}

function recipientStudent(student: any) {
  return { id: student.id, name: student.name, classId: student.classId, admissionNo: student.admissionNo };
}

function recipientClass(cls: any) {
  return { id: cls.id, name: cls.name, teacherUserId: cls.teacherUserId };
}

app.get("/recipients", async (c) => {
  const user = c.get("user")!;
  const role = await roleOf(user.id);
  const allClasses = await db.select().from(classes);
  const allStudents = await db.select().from(students);

  if (role === "teacher") {
    const classIds = allClasses.filter((cls) => cls.teacherUserId === user.id).map((cls) => cls.id);
    return c.json({
      classes: allClasses.filter((cls) => classIds.includes(cls.id)).map(recipientClass),
      students: allStudents.filter((student) => student.classId !== null && classIds.includes(student.classId!)).map(recipientStudent),
      canSendAll: false,
    });
  }

  return c.json({
    classes: allClasses.map(recipientClass),
    students: allStudents.map(recipientStudent),
    canSendAll: ["admin", "principal", "accountant"].includes(role),
  });
});

app.get("/", async (c) => {
  const rows = await db.select().from(messages).orderBy(desc(messages.sentAt));
  return c.json(rows);
});

app.post("/", async (c) => {
  const user = c.get("user")!;
  const role = await roleOf(user.id);
  if (!["admin", "principal", "teacher", "accountant"].includes(role)) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const subject = String(body.subject || "").trim();
  const messageBody = String(body.body || "").trim();
  const recipientType = String(body.recipientType || "");
  const recipientId = body.recipientId === null || body.recipientId === undefined || body.recipientId === ""
    ? null
    : Number(body.recipientId);

  if (!subject || subject.length > 200 || !messageBody || messageBody.length > 5000) {
    return c.json({ message: "Subject and message are required and must be within the allowed length" }, 400);
  }
  if (!RECIPIENT_TYPES.includes(recipientType as any)) {
    return c.json({ message: "Invalid recipient type" }, 400);
  }
  if (recipientType === "all" && recipientId !== null) {
    return c.json({ message: "All-parent messages must not include a recipient id" }, 400);
  }
  if (recipientType !== "all" && (!Number.isInteger(recipientId) || Number(recipientId) <= 0)) {
    return c.json({ message: "A valid recipient is required" }, 400);
  }

  let targetClassId: number | null = null;
  if (recipientType === "class") {
    const [cls] = await db.select().from(classes).where(eq(classes.id, Number(recipientId)));
    if (!cls) return c.json({ message: "Class not found" }, 404);
    targetClassId = cls.id;
  }
  if (recipientType === "individual") {
    const [student] = await db.select().from(students).where(eq(students.id, Number(recipientId)));
    if (!student) return c.json({ message: "Student not found" }, 404);
    targetClassId = student.classId ?? null;
  }

  if (role === "teacher") {
    if (recipientType === "all") {
      return c.json({ message: "Teachers can message only their assigned class or students" }, 403);
    }
    const classIds = await assignedClassIds(user.id);
    if (!targetClassId || !classIds.includes(targetClassId)) {
      return c.json({ message: "Recipient is outside your assigned class" }, 403);
    }
  }

  const [sender] = await db.select().from(staff).where(eq(staff.userId, user.id));
  const [row] = await db.insert(messages).values({
    subject,
    body: messageBody,
    recipientType,
    recipientId,
    sentBy: sender?.id ?? null,
  }).returning();
  return c.json(row, 201);
});

app.delete("/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.json({ message: "Invalid message id" }, 400);

  const [existing] = await db.select().from(messages).where(eq(messages.id, id));
  if (!existing) return c.json({ message: "Message not found" }, 404);

  await db.delete(messages).where(eq(messages.id, id));
  return c.json({ success: true });
});

export default app;
