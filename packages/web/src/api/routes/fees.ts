import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrAccountant, requireFinanceAccess } from "../middleware/auth";
import { buildFeeLedger, obligationKeyForCandidate } from "../lib/fee-ledger";

const PAYMENT_METHODS = ["cash", "mpesa", "bank"] as const;
const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
const FREQUENCIES = ["termly", "monthly", "annual", "once"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const financeStudent = (student: any) => ({
  id: student.id,
  admissionNo: student.admissionNo,
  name: student.name,
  classId: student.classId,
  parentName: student.parentName,
  parentPhone: student.parentPhone,
  status: student.status,
});

async function allLedgerData() {
  const payments = await db.select().from(schema.feePayments);
  const structures = await db.select().from(schema.feeStructures);
  return { structures, ledger: buildFeeLedger(payments, structures) };
}

export const feeStructuresRoutes = new Hono()
  .get("/", requireFinanceAccess, async (c) => {
    const data = await db.select().from(schema.feeStructures);
    return c.json({ feeStructures: data }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const body = await c.req.json();
    const classId = validId(body.classId);
    const amount = Number(body.amount);
    const name = String(body.name || "").trim();
    const frequency = String(body.frequency || "termly");

    if (!name || name.length > 160 || !classId || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ message: "Fee name, class, and a positive amount are required" }, 400);
    }
    if (!FREQUENCIES.includes(frequency as any)) return c.json({ message: "Invalid fee frequency" }, 400);

    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
    if (!cls) return c.json({ message: "Class not found" }, 404);

    const [fs] = await db.insert(schema.feeStructures).values({ name, classId, amount, frequency }).returning();
    return c.json({ feeStructure: fs }, 201);
  })
  .put("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid fee structure id" }, 400);

    const [existing] = await db.select().from(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    if (!existing) return c.json({ message: "Fee structure not found" }, 404);

    const body = await c.req.json();
    const classId = validId(body.classId);
    const amount = Number(body.amount);
    const name = String(body.name || "").trim();
    const frequency = String(body.frequency || "termly");

    if (!name || name.length > 160 || !classId || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ message: "Fee name, class, and a positive amount are required" }, 400);
    }
    if (!FREQUENCIES.includes(frequency as any)) return c.json({ message: "Invalid fee frequency" }, 400);

    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
    if (!cls) return c.json({ message: "Class not found" }, 404);

    const history = await db.select().from(schema.feePayments).where(eq(schema.feePayments.feeStructureId, id));
    if (history.length > 0 && (
      existing.classId !== classId ||
      Number(existing.amount) !== amount ||
      existing.frequency !== frequency
    )) {
      return c.json({ message: "This fee structure has payment history. Class, amount, and frequency cannot be changed; create a new fee structure instead." }, 409);
    }

    const [fs] = await db.update(schema.feeStructures)
      .set({ name, classId, amount, frequency })
      .where(eq(schema.feeStructures.id, id))
      .returning();
    return c.json({ feeStructure: fs }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid fee structure id" }, 400);

    const [existing] = await db.select().from(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    if (!existing) return c.json({ message: "Fee structure not found" }, 404);

    const history = await db.select().from(schema.feePayments).where(eq(schema.feePayments.feeStructureId, id));
    if (history.length > 0) {
      return c.json({ message: "This fee structure has payment history and cannot be deleted" }, 409);
    }

    await db.delete(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const feePaymentsRoutes = new Hono()
  .get("/students", requireFinanceAccess, async (c) => {
    const students = await db.select().from(schema.students);
    return c.json({ students: students.map(financeStudent) }, 200);
  })
  .get("/defaulters", requireFinanceAccess, async (c) => {
    const { ledger } = await allLedgerData();
    const students = await db.select().from(schema.students);
    const classes = await db.select().from(schema.classes);
    const outstanding = ledger.obligations.filter((obligation) => obligation.balance > 0);

    const map: Record<number, { student: any; class: any; totalOwed: number; totalPaid: number; entries: any[]; obligations: any[] }> = {};
    for (const obligation of outstanding) {
      if (!map[obligation.studentId]) {
        const student = students.find((item) => item.id === obligation.studentId);
        const cls = classes.find((item) => item.id === student?.classId);
        map[obligation.studentId] = {
          student: student ? financeStudent(student) : null,
          class: cls ? { id: cls.id, name: cls.name } : null,
          totalOwed: 0,
          totalPaid: 0,
          entries: [],
          obligations: [],
        };
      }
      map[obligation.studentId].totalOwed += obligation.balance;
      map[obligation.studentId].totalPaid += obligation.totalPaid;
      map[obligation.studentId].entries.push(...obligation.entries);
      map[obligation.studentId].obligations.push({
        key: obligation.key,
        feeStructureId: obligation.feeStructureId,
        period: obligation.period,
        amount: obligation.amount,
        paid: obligation.totalPaid,
        discount: obligation.totalDiscount,
        balance: obligation.balance,
      });
    }

    const defaulters = Object.values(map).sort((a, b) => b.totalOwed - a.totalOwed);
    return c.json({
      defaulters,
      count: defaulters.length,
      totalOutstanding: outstanding.reduce((sum, obligation) => sum + obligation.balance, 0),
    }, 200);
  })
  .get("/", requireFinanceAccess, async (c) => {
    const { ledger } = await allLedgerData();
    return c.json({
      payments: ledger.payments,
      summary: ledger.summary,
      obligations: ledger.obligations.map((obligation) => ({
        key: obligation.key,
        studentId: obligation.studentId,
        feeStructureId: obligation.feeStructureId,
        frequency: obligation.frequency,
        term: obligation.term,
        period: obligation.period,
        amount: obligation.amount,
        totalPaid: obligation.totalPaid,
        totalDiscount: obligation.totalDiscount,
        balance: obligation.balance,
        paymentCount: obligation.entries.length,
      })),
    }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const studentId = validId(body.studentId);
    const feeStructureId = body.feeStructureId === null || body.feeStructureId === undefined || body.feeStructureId === ""
      ? null
      : validId(body.feeStructureId);
    const submittedAmount = Number(body.amount);
    const paidAmount = Number(body.paidAmount);
    const discount = Number(body.discount || 0);
    const paymentMethod = String(body.paymentMethod || "cash");
    const paymentDate = String(body.paymentDate || "");
    const term = body.term ? String(body.term) : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!studentId || !validDate(paymentDate)) {
      return c.json({ message: "A valid student and payment date are required" }, 400);
    }
    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0 || !Number.isFinite(paidAmount) || paidAmount < 0 || !Number.isFinite(discount) || discount < 0) {
      return c.json({ message: "Payment amounts must be valid non-negative numbers" }, 400);
    }
    if (paidAmount <= 0 && discount <= 0) {
      return c.json({ message: "Enter an amount paid or a discount" }, 400);
    }
    if (!PAYMENT_METHODS.includes(paymentMethod as any)) return c.json({ message: "Invalid payment method" }, 400);
    if (term && !TERMS.includes(term as any)) return c.json({ message: "Invalid school term" }, 400);
    if (notes && notes.length > 500) return c.json({ message: "Payment notes are too long" }, 400);
    if (body.feeStructureId !== null && body.feeStructureId !== undefined && body.feeStructureId !== "" && !feeStructureId) {
      return c.json({ message: "Invalid fee structure" }, 400);
    }

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return c.json({ message: "Student not found" }, 404);

    const structures = await db.select().from(schema.feeStructures);
    const feeStructure = feeStructureId ? structures.find((structure) => structure.id === feeStructureId) : undefined;
    if (feeStructureId && !feeStructure) return c.json({ message: "Fee structure not found" }, 404);

    if (feeStructure) {
      if (student.classId !== feeStructure.classId) {
        return c.json({ message: "Fee structure does not apply to the selected student's class" }, 400);
      }
      if (feeStructure.frequency === "termly" && !term) {
        return c.json({ message: "Term is required for a termly fee" }, 400);
      }
    }

    const existingPayments = await db.select().from(schema.feePayments);
    const existingLedger = buildFeeLedger(existingPayments, structures);
    const candidateKey = obligationKeyForCandidate({
      id: 0,
      studentId,
      feeStructureId,
      paymentDate,
      term,
    }, feeStructure);
    const existingObligation = existingLedger.obligations.find((obligation) => obligation.key === candidateKey);

    const amount = existingObligation?.amount ?? (feeStructure ? Number(feeStructure.amount) : submittedAmount);
    const remainingBeforePayment = existingObligation?.balance ?? amount;
    if (paidAmount + discount > remainingBeforePayment) {
      return c.json({ message: `This payment exceeds the remaining balance of KES ${remainingBeforePayment.toLocaleString("en-KE")}` }, 400);
    }

    const [collector] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
    const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const balance = Math.max(0, remainingBeforePayment - paidAmount - discount);
    const [inserted] = await db.insert(schema.feePayments).values({
      studentId,
      feeStructureId,
      amount,
      discount,
      paidAmount,
      balance,
      paymentDate,
      paymentMethod,
      term,
      receiptNo,
      notes,
      collectedBy: collector?.id ?? null,
    }).returning();

    const refreshedPayments = [...existingPayments, inserted];
    const refreshedLedger = buildFeeLedger(refreshedPayments, structures);
    const payment = refreshedLedger.payments.find((item) => item.id === inserted.id) ?? inserted;
    const obligation = refreshedLedger.obligations.find((item) => item.key === candidateKey);
    return c.json({ payment, obligation }, 201);
  })
  .get("/:id", requireFinanceAccess, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid payment id" }, 400);

    const { ledger } = await allLedgerData();
    const payment = ledger.payments.find((item) => item.id === id);
    if (!payment) return c.json({ message: "Payment not found" }, 404);
    return c.json({ payment }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid payment id" }, 400);

    const [existing] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.id, id));
    if (!existing) return c.json({ message: "Payment not found" }, 404);

    await db.delete(schema.feePayments).where(eq(schema.feePayments.id, id));
    return c.json({ message: "Deleted" }, 200);
  });