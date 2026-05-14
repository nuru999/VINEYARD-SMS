import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = new Hono()
  .get("/stats", requireAuth, async (c) => {
    const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.students).where(eq(schema.students.status, "active"));
    const [staffCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.staff).where(eq(schema.staff.status, "active"));
    const [classCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.classes);
    const payments = await db.select({ amount: schema.feePayments.paidAmount }).from(schema.feePayments);
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const income = await db.select({ amount: schema.transactions.amount }).from(schema.transactions).where(eq(schema.transactions.type, "income"));
    const expenses = await db.select({ amount: schema.transactions.amount }).from(schema.transactions).where(eq(schema.transactions.type, "expense"));
    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);

    return c.json({
      stats: {
        totalStudents: studentCount.count,
        totalStaff: staffCount.count,
        totalClasses: classCount.count,
        totalRevenue,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
      }
    }, 200);
  });
