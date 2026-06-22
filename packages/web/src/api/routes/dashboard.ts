import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, gt, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

// helper: "2024-06" from a date string or Date
function toYearMonth(d: string | Date) {
  const s = typeof d === "string" ? d : d.toISOString();
  return s.slice(0, 7); // "YYYY-MM"
}

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
  })

  // ── GET /api/dashboard/analytics ─────────────────────────────────────────
  .get("/analytics", requireAuth, async (c) => {
    const [allPayments, allStudents, allClasses, allAttendance] = await Promise.all([
      db.select().from(schema.feePayments),
      db.select().from(schema.students),
      db.select().from(schema.classes),
      db.select().from(schema.attendance),
    ]);

    // 1. Fees collected per term
    const termMap: Record<string, { term: string; collected: number; outstanding: number }> = {};
    for (const p of allPayments) {
      const key = p.term ?? "Unassigned";
      if (!termMap[key]) termMap[key] = { term: key, collected: 0, outstanding: 0 };
      termMap[key].collected += p.paidAmount ?? 0;
      termMap[key].outstanding += p.balance ?? 0;
    }
    const feesByTerm = Object.values(termMap).sort((a, b) => a.term.localeCompare(b.term));

    // 2. Monthly fee collection — last 6 months
    const monthMap: Record<string, number> = {};
    for (const p of allPayments) {
      const ym = toYearMonth(p.paymentDate);
      monthMap[ym] = (monthMap[ym] ?? 0) + (p.paidAmount ?? 0);
    }
    const sortedMonths = Object.keys(monthMap).sort().slice(-6);
    const monthlyFees = sortedMonths.map(ym => ({
      month: new Date(ym + "-01").toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
      collected: monthMap[ym],
    }));

    // 3. Students per class
    const classStudents = allClasses.map(cls => ({
      class: cls.name,
      students: allStudents.filter(s => s.classId === cls.id).length,
    })).filter(c => c.students > 0).sort((a, b) => b.students - a.students);

    // 4. Overall attendance breakdown
    const attCount = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const a of allAttendance) {
      if (a.status === "present") attCount.present++;
      else if (a.status === "absent") attCount.absent++;
      else if (a.status === "late") attCount.late++;
      else if (a.status === "leave") attCount.leave++;
    }
    const attendancePie = [
      { name: "Present", value: attCount.present, color: "#22C55E" },
      { name: "Absent", value: attCount.absent, color: "#EF4444" },
      { name: "Late", value: attCount.late, color: "#F59E0B" },
      { name: "Leave", value: attCount.leave, color: "#6366F1" },
    ].filter(d => d.value > 0);

    // 5. Student status breakdown
    const statusMap: Record<string, number> = {};
    for (const s of allStudents) {
      statusMap[s.status] = (statusMap[s.status] ?? 0) + 1;
    }
    const studentStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    return c.json({
      feesByTerm,
      monthlyFees,
      classStudents,
      attendancePie,
      studentStatus,
    }, 200);
  });
