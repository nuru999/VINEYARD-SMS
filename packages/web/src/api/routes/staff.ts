import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";

const DESIGNATIONS = ["Principal", "Teacher", "Accountant", "Admin", "Other"] as const;
const STATUSES = ["active", "inactive"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: unknown) {
  return !value || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function staffInput(body: any) {
  const name = String(body.name || "").trim();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const phone = body.phone ? String(body.phone).trim() : null;
  const designation = String(body.designation || "");
  const department = body.department ? String(body.department).trim() : null;
  const qualification = body.qualification ? String(body.qualification).trim() : null;
  const joiningDate = body.joiningDate ? String(body.joiningDate) : null;
  const salary = Number(body.salary ?? 0);
  const status = String(body.status || "active");

  if (!name || name.length > 150) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!DESIGNATIONS.includes(designation as any)) return null;
  if (!STATUSES.includes(status as any)) return null;
  if (!Number.isFinite(salary) || salary < 0) return null;
  if (!validDate(joiningDate)) return null;
  if (phone && phone.length > 40) return null;
  if (department && department.length > 120) return null;
  if (qualification && qualification.length > 200) return null;

  return { name, email, phone, designation, department, qualification, joiningDate, salary, status };
}

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function hasStaffHistory(staffId: number) {
  const checks = await Promise.all([
    db.select({ id: schema.payroll.id }).from(schema.payroll).where(eq(schema.payroll.staffId, staffId)).limit(1),
    db.select({ id: schema.staffAttendance.id }).from(schema.staffAttendance).where(eq(schema.staffAttendance.staffId, staffId)).limit(1),
    db.select({ id: schema.attendance.id }).from(schema.attendance).where(eq(schema.attendance.markedBy, staffId)).limit(1),
    db.select({ id: schema.feePayments.id }).from(schema.feePayments).where(eq(schema.feePayments.collectedBy, staffId)).limit(1),
    db.select({ id: schema.certificates.id }).from(schema.certificates).where(eq(schema.certificates.issuedBy, staffId)).limit(1),
    db.select({ id: schema.transactions.id }).from(schema.transactions).where(eq(schema.transactions.createdBy, staffId)).limit(1),
    db.select({ id: schema.timetableSlots.id }).from(schema.timetableSlots).where(eq(schema.timetableSlots.teacherId, staffId)).limit(1),
    db.select({ id: schema.messages.id }).from(schema.messages).where(eq(schema.messages.sentBy, staffId)).limit(1),
    db.select({ id: schema.sections.id }).from(schema.sections).where(eq(schema.sections.teacherId, staffId)).limit(1),
    db.select({ id: schema.subjects.id }).from(schema.subjects).where(eq(schema.subjects.teacherId, staffId)).limit(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

export const staffRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);

    if (!["admin", "principal", "accountant"].includes(role)) {
      return c.json({ message: "Forbidden: staff directory access required" }, 403);
    }

    const data = await db.select().from(schema.staff);
    if (role === "accountant") {
      return c.json({
        staff: data.map((member) => ({
          id: member.id,
          name: member.name,
          designation: member.designation,
          salary: member.salary,
          status: member.status,
        })),
      }, 200);
    }

    return c.json({ staff: data }, 200);
  })
  .post("/", requireAdminOrPrincipal, async (c) => {
    const input = staffInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid name, designation, status, non-negative salary, email, and joining date are required" }, 400);
    }

    if (input.email) {
      const duplicate = (await db.select().from(schema.staff)).find(
        (member) => member.email?.toLowerCase() === input.email
      );
      if (duplicate) return c.json({ message: "A staff member with this email already exists" }, 409);
    }

    const [member] = await db.insert(schema.staff).values(input).returning();
    return c.json({ staff: member }, 201);
  })
  .get("/:id", requireAdminOrPrincipal, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid staff id" }, 400);

    const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    if (!member) return c.json({ message: "Staff member not found" }, 404);
    return c.json({ staff: member }, 200);
  })
  .put("/:id", requireAdminOrPrincipal, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid staff id" }, 400);

    const [existing] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    if (!existing) return c.json({ message: "Staff member not found" }, 404);

    const input = staffInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid name, designation, status, non-negative salary, email, and joining date are required" }, 400);
    }

    if (input.email) {
      const duplicate = (await db.select().from(schema.staff)).find(
        (member) => member.id !== id && member.email?.toLowerCase() === input.email
      );
      if (duplicate) return c.json({ message: "A staff member with this email already exists" }, 409);
    }

    const [member] = await db.update(schema.staff).set(input).where(eq(schema.staff.id, id)).returning();
    return c.json({ staff: member }, 200);
  })
  .delete("/:id", requireAdminOrPrincipal, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid staff id" }, 400);

    const [member] = await db.select().from(schema.staff).where(eq(schema.staff.id, id));
    if (!member) return c.json({ message: "Staff member not found" }, 404);

    if (member.userId) {
      return c.json({ message: "This staff member has a login account. Remove the login account first, or mark the staff member inactive." }, 409);
    }

    if (await hasStaffHistory(id)) {
      return c.json({ message: "This staff member has school records/history and cannot be deleted. Mark the staff member inactive instead." }, 409);
    }

    await db.delete(schema.staff).where(eq(schema.staff.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
