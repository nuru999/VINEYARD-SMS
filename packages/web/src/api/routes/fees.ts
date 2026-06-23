import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, gt } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const feeStructuresRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.feeStructures);
    return c.json({ feeStructures: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [fs] = await db.insert(schema.feeStructures).values(body).returning();
    return c.json({ feeStructure: fs }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { id: _id, createdAt, ...safePayload } = body;
    const [fs] = await db.update(schema.feeStructures).set(safePayload).where(eq(schema.feeStructures.id, id)).returning();
    if (!fs) return c.json({ message: "Fee structure not found" }, 404);
    return c.json({ feeStructure: fs }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const feePaymentsRoutes = new Hono()
  .get("/defaulters", requireAuth, async (c) => {
    // All students with any outstanding balance
    const payments = await db.select().from(schema.feePayments).where(gt(schema.feePayments.balance, 0));
    const students = await db.select().from(schema.students);
    const classes = await db.select().from(schema.classes);

    // Group by student, sum outstanding
    const map: Record<number, { student: any; class: any; totalOwed: number; totalPaid: number; entries: any[] }> = {};
    for (const p of payments) {
      if (!map[p.studentId]) {
        const student = students.find(s => s.id === p.studentId);
        const cls = classes.find(c => c.id === student?.classId);
        map[p.studentId] = { student, class: cls, totalOwed: 0, totalPaid: 0, entries: [] };
      }
      map[p.studentId].totalOwed += p.balance || 0;
      map[p.studentId].totalPaid += p.paidAmount || 0;
      map[p.studentId].entries.push(p);
    }

    const defaulters = Object.values(map).sort((a, b) => b.totalOwed - a.totalOwed);
    return c.json({ defaulters, count: defaulters.length }, 200);
  })
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.feePayments);
    return c.json({ payments: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const receiptNo = `RCP-${Date.now()}`;
    const [payment] = await db.insert(schema.feePayments).values({ ...body, receiptNo }).returning();
    return c.json({ payment }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [payment] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.id, id));
    if (!payment) return c.json({ message: "Not found" }, 404);
    return c.json({ payment }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feePayments).where(eq(schema.feePayments.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
