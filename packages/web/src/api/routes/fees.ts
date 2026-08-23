import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, gt } from "drizzle-orm";
import { requireAdminOrAccountant, requireFinanceAccess } from "../middleware/auth";

const PAYMENT_METHODS = ["cash", "mpesa", "bank"] as const;
const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
const FREQUENCIES = ["termly", "monthly", "annual", "once"] as const;

const financeStudent = (student: any) => ({
  id: student.id,
  admissionNo: student.admissionNo,
  name: student.name,
  classId: student.classId,
  parentName: student.parentName,
  parentPhone: student.parentPhone,
  status: student.status,
});

export const feeStructuresRoutes = new Hono()
  .get("/", requireFinanceAccess, async (c) => {
    const data = await db.select().from(schema.feeStructures);
    return c.json({ feeStructures: data }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const body = await c.req.json();
    const classId = Number(body.classId);
    const amount = Number(body.amount);
    const frequency = String(body.frequency || "termly");

    if (!body.name?.trim() || !Number.isInteger(classId) || classId <= 0 || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ message: "Fee name, class, and a positive amount are required" }, 400);
    }
    if (!FREQUENCIES.includes(frequency as any)) return c.json({ message: "Invalid fee frequency" }, 400);

    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
    if (!cls) return c.json({ message: "Class not found" }, 404);

    const [fs] = await db.insert(schema.feeStructures).values({
      name: body.name.trim(),
      classId,
      amount,
      frequency,
    }).returning();
    return c.json({ feeStructure: fs }, 201);
  })
  .put("/:id", requireAdminOrAccountant, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const classId = Number(body.classId);
    const amount = Number(body.amount);
    const frequency = String(body.frequency || "termly");

    if (!body.name?.trim() || !Number.isInteger(classId) || classId <= 0 || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ message: "Fee name, class, and a positive amount are required" }, 400);
    }
    if (!FREQUENCIES.includes(frequency as any)) return c.json({ message: "Invalid fee frequency" }, 400);

    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
    if (!cls) return c.json({ message: "Class not found" }, 404);

    const [fs] = await db.update(schema.feeStructures).set({
      name: body.name.trim(),
      classId,
      amount,
      frequency,
    }).where(eq(schema.feeStructures.id, id)).returning();
    if (!fs) return c.json({ message: "Fee structure not found" }, 404);
    return c.json({ feeStructure: fs }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const feePaymentsRoutes = new Hono()
  // Minimal student details needed by finance workflows. This avoids granting
  // accountants access to the full academic student record endpoint.
  .get("/students", requireFinanceAccess, async (c) => {
    const students = await db.select().from(schema.students);
    return c.json({ students: students.map(financeStudent) }, 200);
  })
  .get("/defaulters", requireFinanceAccess, async (c) => {
    const payments = await db.select().from(schema.feePayments).where(gt(schema.feePayments.balance, 0));
    const students = await db.select().from(schema.students);
    const classes = await db.select().from(schema.classes);

    const map: Record<number, { student: any; class: any; totalOwed: number; totalPaid: number; entries: any[] }> = {};
    for (const p of payments) {
      if (!map[p.studentId]) {
        const student = students.find(s => s.id === p.studentId);
        const cls = classes.find(c => c.id === student?.classId);
        map[p.studentId] = {
          student: student ? financeStudent(student) : null,
          class: cls ? { id: cls.id, name: cls.name } : null,
          totalOwed: 0,
          totalPaid: 0,
          entries: [],
        };
      }
      map[p.studentId].totalOwed += Number(p.balance || 0);
      map[p.studentId].totalPaid += Number(p.paidAmount || 0);
      map[p.studentId].entries.push(p);
    }

    const defaulters = Object.values(map).sort((a, b) => b.totalOwed - a.totalOwed);
    return c.json({ defaulters, count: defaulters.length }, 200);
  })
  .get("/", requireFinanceAccess, async (c) => {
    const data = await db.select().from(schema.feePayments);
    return c.json({ payments: data }, 200);
  })
  .post("/", requireFinanceAccess, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const studentId = Number(body.studentId);
    const feeStructureId = body.feeStructureId ? Number(body.feeStructureId) : null;
    const submittedAmount = Number(body.amount);
    const paidAmount = Number(body.paidAmount);
    const discount = Number(body.discount || 0);
    const paymentMethod = String(body.paymentMethod || "cash");
    const term = body.term ? String(body.term) : null;

    if (!Number.isInteger(studentId) || studentId <= 0 || !body.paymentDate) {
      return c.json({ message: "Student and payment date are required" }, 400);
    }
    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0 || !Number.isFinite(paidAmount) || paidAmount < 0 || !Number.isFinite(discount) || discount < 0) {
      return c.json({ message: "Payment amounts must be valid non-negative numbers" }, 400);
    }
    if (!PAYMENT_METHODS.includes(paymentMethod as any)) return c.json({ message: "Invalid payment method" }, 400);
    if (term && !TERMS.includes(term as any)) return c.json({ message: "Invalid school term" }, 400);

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ message: "Student not found" }, 404);

    let amount = submittedAmount;
    if (feeStructureId !== null) {
      if (!Number.isInteger(feeStructureId) || feeStructureId <= 0) {
        return c.json({ message: "Invalid fee structure" }, 400);
      }
      const [feeStructure] = await db.select().from(schema.feeStructures).where(eq(schema.feeStructures.id, feeStructureId));
      if (!feeStructure) return c.json({ message: "Fee structure not found" }, 404);
      if (student.classId !== feeStructure.classId) {
        return c.json({ message: "Fee structure does not apply to the selected student's class" }, 400);
      }
      // The configured fee structure is the source of truth for the billed amount.
      amount = Number(feeStructure.amount);
    }

    if (paidAmount + discount > amount) {
      return c.json({ message: "Paid amount plus discount cannot exceed the total fee amount" }, 400);
    }

    const [collector] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
    const balance = amount - paidAmount - discount;
    const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const [payment] = await db.insert(schema.feePayments).values({
      studentId,
      feeStructureId,
      amount,
      discount,
      paidAmount,
      balance,
      paymentDate: String(body.paymentDate),
      paymentMethod,
      term,
      receiptNo,
      notes: body.notes || null,
      collectedBy: collector?.id ?? null,
    }).returning();
    return c.json({ payment }, 201);
  })
  .get("/:id", requireFinanceAccess, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [payment] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.id, id));
    if (!payment) return c.json({ message: "Not found" }, 404);
    return c.json({ payment }, 200);
  })
  // Deleting financial records is limited to admin/accountant. Principals can
  // view and record payments but cannot erase the audit trail.
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feePayments).where(eq(schema.feePayments.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
