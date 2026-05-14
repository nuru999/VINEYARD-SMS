import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = new Hono()
  .get("/stats", requireAuth, async (c) => {
    const [studentCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.students).where(eq(schema.students.status, "active"));
    const [staffCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.staff).where(eq(schema.staff.status, "active"));
    const [classCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.classes);
    // Defaulters count — students with balance > 0
    const defaulterPayments = await db.select({ studentId: schema.feePayments.studentId }).from(schema.feePayments).where(gt(schema.feePayments.balance, 0));
    const defaulterCount = new Set(defaulterPayments.map(p => p.studentId)).size;

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
        defaulterCount,
      }
    }, 200);
  });
