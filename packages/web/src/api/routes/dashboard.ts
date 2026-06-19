import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

function getCurrentTerm(): { term: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Kenya school terms: Term 1 Jan–Apr, Term 2 May–Jul, Term 3 Sep–Nov
  if (month >= 1 && month <= 4) return { term: "Term 1", year };
  if (month >= 5 && month <= 7) return { term: "Term 2", year };
  return { term: "Term 3", year };
}

export const dashboardRoutes = new Hono()
  .get("/stats", requireAuth, async (c) => {
    const today = new Date().toISOString().slice(0, 10);

    const [studentCount, staffCount, classCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.students).where(eq(schema.students.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(schema.staff).where(eq(schema.staff.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(schema.classes),
    ]);

    const [payments, income, expenses, defaulterPayments, balances, todayAttendance] = await Promise.all([
      db.select({ amount: schema.feePayments.paidAmount }).from(schema.feePayments),
      db.select({ amount: schema.transactions.amount }).from(schema.transactions).where(eq(schema.transactions.type, "income")),
      db.select({ amount: schema.transactions.amount }).from(schema.transactions).where(eq(schema.transactions.type, "expense")),
      db.select({ studentId: schema.feePayments.studentId }).from(schema.feePayments).where(gt(schema.feePayments.balance, 0)),
      db.select({ balance: schema.feePayments.balance }).from(schema.feePayments).where(gt(schema.feePayments.balance, 0)),
      db.select().from(schema.attendance).where(eq(schema.attendance.date, today)),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const defaulterCount = new Set(defaulterPayments.map(p => p.studentId)).size;
    const totalOutstanding = balances.reduce((sum, p) => sum + (p.balance || 0), 0);
    const presentToday = todayAttendance.filter(a => a.status === "present").length;
    const absentToday = todayAttendance.filter(a => a.status === "absent").length;
    const lateToday = todayAttendance.filter(a => a.status === "late").length;
    const attendanceMarked = todayAttendance.length > 0;

    // Current term
    const { term, year } = getCurrentTerm();

    return c.json({
      stats: {
        // Turso/LibSQL returns count(*) as string — cast to Number
        totalStudents: Number(studentCount[0]?.count ?? 0),
        totalStaff: Number(staffCount[0]?.count ?? 0),
        totalClasses: Number(classCount[0]?.count ?? 0),
        totalRevenue,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        defaulterCount,
        totalOutstanding,
        presentToday,
        absentToday,
        lateToday,
        attendanceMarked,
        currentTerm: term,
        currentYear: year,
      }
    }, 200);
  });
