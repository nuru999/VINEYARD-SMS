import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireFinanceAccess } from "../middleware/auth";
import { buildFeeLedger } from "../lib/fee-ledger";

function toYearMonth(d: string | Date) {
  const s = typeof d === "string" ? d : d.toISOString();
  return s.slice(0, 7);
}

function getCurrentTerm(): { term: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 1 && month <= 4) return { term: "Term 1", year };
  if (month >= 5 && month <= 7) return { term: "Term 2", year };
  return { term: "Term 3", year };
}

async function roleOf(userId: string) {
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
  return profile?.role ?? "teacher";
}

export const dashboardRoutes = new Hono()
  .get("/stats", requireAuth, async (c) => {
    const user = c.get("user")!;
    const role = await roleOf(user.id);
    const canViewFinance = ["admin", "principal", "accountant"].includes(role);
    const today = new Date().toISOString().slice(0, 10);

    const [allStudents, allStaff, allClasses, todayAttendance] = await Promise.all([
      db.select().from(schema.students),
      db.select().from(schema.staff),
      db.select().from(schema.classes),
      db.select().from(schema.attendance).where(eq(schema.attendance.date, today)),
    ]);

    const totalStudents = allStudents.filter((student) => String(student.status || "active").toLowerCase() === "active").length;
    const totalStaff = allStaff.filter((member) => String(member.status || "active").toLowerCase() === "active").length;
    const totalClasses = allClasses.length;
    const presentToday = todayAttendance.filter((record) => record.status === "present").length;
    const absentToday = todayAttendance.filter((record) => record.status === "absent").length;
    const lateToday = todayAttendance.filter((record) => record.status === "late").length;
    const attendanceMarked = todayAttendance.length > 0;
    const { term, year } = getCurrentTerm();

    let totalRevenue: number | null = null;
    let totalIncome: number | null = null;
    let totalExpenses: number | null = null;
    let netBalance: number | null = null;
    let defaulterCount: number | null = null;
    let totalOutstanding: number | null = null;

    if (canViewFinance) {
      const [payments, structures, transactions] = await Promise.all([
        db.select().from(schema.feePayments),
        db.select().from(schema.feeStructures),
        db.select().from(schema.transactions),
      ]);
      const ledger = buildFeeLedger(payments, structures);
      totalRevenue = ledger.summary.totalCollected;
      totalOutstanding = ledger.summary.totalOutstanding;
      defaulterCount = new Set(
        ledger.obligations.filter((obligation) => obligation.balance > 0).map((obligation) => obligation.studentId)
      ).size;
      totalIncome = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      totalExpenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
      netBalance = totalIncome - totalExpenses;
    }

    return c.json({
      stats: {
        totalStudents,
        totalStaff,
        totalClasses,
        totalRevenue,
        totalIncome,
        totalExpenses,
        netBalance,
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

  .get("/analytics", requireFinanceAccess, async (c) => {
    const [allPayments, feeStructures, allStudents, allClasses, allAttendance] = await Promise.all([
      db.select().from(schema.feePayments),
      db.select().from(schema.feeStructures),
      db.select().from(schema.students),
      db.select().from(schema.classes),
      db.select().from(schema.attendance),
    ]);
    const ledger = buildFeeLedger(allPayments, feeStructures);

    const termMap: Record<string, { term: string; collected: number; outstanding: number }> = {};
    for (const payment of ledger.payments) {
      const key = payment.term ?? "Unassigned";
      if (!termMap[key]) termMap[key] = { term: key, collected: 0, outstanding: 0 };
      termMap[key].collected += Number(payment.paidAmount || 0);
    }
    for (const obligation of ledger.obligations) {
      const key = obligation.term ?? "Unassigned";
      if (!termMap[key]) termMap[key] = { term: key, collected: 0, outstanding: 0 };
      termMap[key].outstanding += Number(obligation.balance || 0);
    }
    const feesByTerm = Object.values(termMap).sort((a, b) => a.term.localeCompare(b.term));

    const monthMap: Record<string, number> = {};
    for (const payment of ledger.payments) {
      const ym = toYearMonth(payment.paymentDate);
      monthMap[ym] = (monthMap[ym] ?? 0) + Number(payment.paidAmount || 0);
    }
    const sortedMonths = Object.keys(monthMap).sort().slice(-6);
    const monthlyFees = sortedMonths.map((ym) => ({
      month: new Date(ym + "-01").toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
      collected: monthMap[ym],
    }));

    const classStudents = allClasses.map((cls) => ({
      class: cls.name,
      students: allStudents.filter((student) => student.classId === cls.id && String(student.status || "active").toLowerCase() === "active").length,
    })).filter((item) => item.students > 0).sort((a, b) => b.students - a.students);

    const attCount = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const attendance of allAttendance) {
      if (attendance.status === "present") attCount.present++;
      else if (attendance.status === "absent") attCount.absent++;
      else if (attendance.status === "late") attCount.late++;
      else if (attendance.status === "leave") attCount.leave++;
    }
    const attendancePie = [
      { name: "Present", value: attCount.present, color: "#22C55E" },
      { name: "Absent", value: attCount.absent, color: "#EF4444" },
      { name: "Late", value: attCount.late, color: "#F59E0B" },
      { name: "Leave", value: attCount.leave, color: "#6366F1" },
    ].filter((item) => item.value > 0);

    const statusMap: Record<string, number> = {};
    for (const student of allStudents) {
      const status = String(student.status || "active").toLowerCase();
      statusMap[status] = (statusMap[status] ?? 0) + 1;
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
