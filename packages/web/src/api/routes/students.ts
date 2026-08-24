import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { buildFeeLedger } from "../lib/fee-ledger";

const GENDERS = ["male", "female"] as const;
const STATUSES = ["active", "inactive", "graduated", "transferred"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: unknown) {
  return !value || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizedStudent<T extends Record<string, any>>(student: T) {
  return {
    ...student,
    gender: student.gender ? String(student.gender).trim().toLowerCase() : null,
    status: student.status ? String(student.status).trim().toLowerCase() : "active",
  };
}

function studentInput(body: any) {
  const name = String(body.name || "").trim();
  const admissionNo = String(body.admissionNo || "").trim().toUpperCase();
  const dob = body.dob ? String(body.dob) : null;
  const rawGender = body.gender ? String(body.gender).trim().toLowerCase() : null;
  const classId = body.classId === null || body.classId === undefined || body.classId === ""
    ? null
    : validId(body.classId);
  const sectionId = body.sectionId === null || body.sectionId === undefined || body.sectionId === ""
    ? null
    : validId(body.sectionId);
  const parentName = body.parentName ? String(body.parentName).trim() : null;
  const parentPhone = body.parentPhone ? String(body.parentPhone).trim() : null;
  const parentEmail = body.parentEmail ? String(body.parentEmail).trim().toLowerCase() : null;
  const address = body.address ? String(body.address).trim() : null;
  const admissionDate = body.admissionDate ? String(body.admissionDate) : null;
  const status = String(body.status || "active").trim().toLowerCase();

  if (!name || name.length > 160 || !admissionNo || admissionNo.length > 60) return null;
  if (!validDate(dob) || !validDate(admissionDate)) return null;
  if (rawGender && !GENDERS.includes(rawGender as any)) return null;
  if (!STATUSES.includes(status as any)) return null;
  if (body.classId !== null && body.classId !== undefined && body.classId !== "" && !classId) return null;
  if (body.sectionId !== null && body.sectionId !== undefined && body.sectionId !== "" && !sectionId) return null;
  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) return null;
  if (parentName && parentName.length > 160) return null;
  if (parentPhone && parentPhone.length > 40) return null;
  if (address && address.length > 500) return null;

  return {
    name,
    admissionNo,
    dob,
    gender: rawGender,
    classId,
    sectionId,
    parentName,
    parentPhone,
    parentEmail,
    address,
    admissionDate,
    status,
  };
}

async function validateAcademicPlacement(classId: number | null, sectionId: number | null) {
  if (classId) {
    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
    if (!cls) return "Selected class not found";
  }

  if (sectionId) {
    const [section] = await db.select().from(schema.sections).where(eq(schema.sections.id, sectionId));
    if (!section) return "Selected section not found";
    if (!classId || section.classId !== classId) return "Selected section does not belong to the selected class";
  }

  return null;
}

async function studentHasHistory(studentId: number) {
  const checks = await Promise.all([
    db.select({ id: schema.feePayments.id }).from(schema.feePayments).where(eq(schema.feePayments.studentId, studentId)).limit(1),
    db.select({ id: schema.attendance.id }).from(schema.attendance).where(eq(schema.attendance.studentId, studentId)).limit(1),
    db.select({ id: schema.examResults.id }).from(schema.examResults).where(eq(schema.examResults.studentId, studentId)).limit(1),
    db.select({ id: schema.certificates.id }).from(schema.certificates).where(eq(schema.certificates.studentId, studentId)).limit(1),
    db.select({ id: schema.transportAssignments.id }).from(schema.transportAssignments).where(eq(schema.transportAssignments.studentId, studentId)).limit(1),
    db.select({ id: schema.libraryBorrows.id }).from(schema.libraryBorrows).where(eq(schema.libraryBorrows.studentId, studentId)).limit(1),
    db.select({ id: schema.messages.id }).from(schema.messages).where(
      and(eq(schema.messages.recipientType, "individual"), eq(schema.messages.recipientId, studentId))
    ).limit(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

async function assignedClassIds(userId: string) {
  const allClasses = await db.select().from(schema.classes);
  return allClasses.filter((cls) => cls.teacherUserId === userId).map((cls) => cls.id);
}

export const students = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const allClasses = await db.select().from(schema.classes);

    if (role === "admin" || role === "principal") {
      const allStudents = await db.select().from(schema.students);
      return c.json({
        students: allStudents.map((student) => ({
          ...normalizedStudent(student),
          className: student.classId ? allClasses.find((cls) => cls.id === student.classId)?.name ?? null : null,
        })),
      }, 200);
    }

    const classIds = await assignedClassIds(user.id);
    if (!classIds.length) return c.json({ students: [] }, 200);

    const allStudents = await db.select().from(schema.students);
    return c.json({
      students: allStudents
        .filter((student) => student.classId !== null && classIds.includes(student.classId))
        .map((student) => ({
          ...normalizedStudent(student),
          className: allClasses.find((cls) => cls.id === student.classId)?.name ?? null,
        })),
    }, 200);
  })

  .post("/", requireAdmin, async (c) => {
    const input = studentInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid name, admission number, gender, status, dates, contact details, and academic placement are required" }, 400);
    }

    const duplicate = (await db.select().from(schema.students)).find(
      (student) => student.admissionNo.trim().toLowerCase() === input.admissionNo.toLowerCase()
    );
    if (duplicate) return c.json({ message: "A student with this admission number already exists" }, 409);

    const placementError = await validateAcademicPlacement(input.classId, input.sectionId);
    if (placementError) return c.json({ message: placementError }, 400);

    const [student] = await db.insert(schema.students).values(input).returning();
    return c.json({ student: normalizedStudent(student) }, 201);
  })

  .get("/:id", requireAuth, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid student id" }, 400);

    const user = c.get("user")!;
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Student not found" }, 404);

    const role = await roleOf(user.id);
    if (role !== "admin" && role !== "principal") {
      const classIds = await assignedClassIds(user.id);
      if (!student.classId || !classIds.includes(student.classId)) return c.json({ message: "Forbidden" }, 403);
    }

    const allClasses = await db.select().from(schema.classes);
    const cls = allClasses.find((item) => item.id === student.classId);
    return c.json({ student: { ...normalizedStudent(student), className: cls?.name ?? null } }, 200);
  })

  .get("/:id/profile", requireAuth, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid student id" }, 400);

    const user = c.get("user")!;
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Student not found" }, 404);

    const role = await roleOf(user.id);
    const allClasses = await db.select().from(schema.classes);
    if (role !== "admin" && role !== "principal") {
      const classIds = await assignedClassIds(user.id);
      if (!student.classId || !classIds.includes(student.classId)) return c.json({ message: "Forbidden" }, 403);
    }

    const cls = allClasses.find((item) => item.id === student.classId) ?? null;
    const rawPayments = await db.select().from(schema.feePayments).where(eq(schema.feePayments.studentId, id));
    const feeStructures = await db.select().from(schema.feeStructures);
    const ledger = buildFeeLedger(rawPayments, feeStructures);
    const attendanceRecords = await db.select().from(schema.attendance).where(eq(schema.attendance.studentId, id));

    const totalPaid = ledger.summary.totalCollected;
    const totalBalance = ledger.summary.totalOutstanding;
    const totalAmount = ledger.obligations.reduce((sum, obligation) => sum + obligation.amount, 0);
    const attendanceSummary = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((record) => record.status === "present").length,
      absent: attendanceRecords.filter((record) => record.status === "absent").length,
      late: attendanceRecords.filter((record) => record.status === "late").length,
      leave: attendanceRecords.filter((record) => record.status === "leave").length,
    };

    return c.json({
      student: { ...normalizedStudent(student), className: cls?.name ?? null },
      class: cls,
      payments: ledger.payments.map((payment) => ({
        ...payment,
        feeStructureName: feeStructures.find((fee) => fee.id === payment.feeStructureId)?.name ?? null,
      })),
      feeSummary: {
        totalPaid,
        totalBalance,
        totalAmount,
        totalDiscount: ledger.summary.totalDiscount,
        obligationCount: ledger.summary.obligationCount,
        count: ledger.payments.length,
      },
      attendanceSummary,
      attendanceRecords,
    }, 200);
  })

  .put("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid student id" }, 400);

    const [existing] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    if (!existing) return c.json({ message: "Student not found" }, 404);

    const input = studentInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid name, admission number, gender, status, dates, contact details, and academic placement are required" }, 400);
    }

    const duplicate = (await db.select().from(schema.students)).find(
      (student) => student.id !== id && student.admissionNo.trim().toLowerCase() === input.admissionNo.toLowerCase()
    );
    if (duplicate) return c.json({ message: "A student with this admission number already exists" }, 409);

    const placementError = await validateAcademicPlacement(input.classId, input.sectionId);
    if (placementError) return c.json({ message: placementError }, 400);

    const [student] = await db.update(schema.students).set(input).where(eq(schema.students.id, id)).returning();
    return c.json({ student: normalizedStudent(student) }, 200);
  })

  .delete("/:id", requireAdmin, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid student id" }, 400);

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    if (!student) return c.json({ message: "Student not found" }, 404);

    if (await studentHasHistory(id)) {
      return c.json({ message: "This student has school records/history and cannot be deleted. Mark the student inactive, graduated, or transferred instead." }, 409);
    }

    await db.delete(schema.students).where(eq(schema.students.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
