import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Layout } from "../components/layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

const SCHOOL_NAME = "Vineyard Primary School";
const SCHOOL_MOTTO = "Fruitful Development";
const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;
const fmtNum = (n: number) => new Intl.NumberFormat("en-KE").format(n);

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1B4D4D; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 20px; }
      .school-name { font-size: 20px; font-weight: 700; color: #1B4D4D; }
      .school-motto { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 14px; font-weight: 700; color: #1B4D4D; border-bottom: 2px solid #1B4D4D; padding-bottom: 6px; margin-bottom: 12px; }
      .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
      .stat-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
      .stat-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
      .stat-value { font-size: 18px; font-weight: 700; color: #1B4D4D; }
      .total-row td { font-weight: 700; background: #f8fafc; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { body { padding: 16px; } }
    </style>
  </head><body>${html}
    <div class="footer">Printed: ${new Date().toLocaleString("en-KE")} · ${SCHOOL_NAME}</div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

function BarChart({ data, colorFn }: { data: { label: string; value: number }[]; colorFn?: (i: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtNum(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--bg-primary)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(d.value / max) * 100}%`, borderRadius: 4, background: colorFn ? colorFn(i) : "var(--accent)", transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color = "var(--text-primary)" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{sub}</div>}
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { data: studentsData } = useQuery({
    queryKey: ["students-all"],
    queryFn: async () => {
      const r = await fetch("/api/students?limit=1000", { credentials: "include" });
      if (!r.ok) return { students: [] };
      return r.json();
    },
  });
  const { data: feePaymentsData } = useQuery({
    queryKey: ["fee-payments-all"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments?limit=1000", { credentials: "include" });
      if (!r.ok) return { payments: [] };
      return r.json();
    },
  });
  const { data: feeStructData } = useQuery({
    queryKey: ["fee-structures-all"],
    queryFn: async () => {
      const r = await fetch("/api/fee-structures?limit=1000", { credentials: "include" });
      if (!r.ok) return { structures: [] };
      return r.json();
    },
  });
  const { data: staffData } = useQuery({
    queryKey: ["staff-all"],
    queryFn: async () => {
      const r = await fetch("/api/staff?limit=1000", { credentials: "include" });
      if (!r.ok) return { staff: [] };
      return r.json();
    },
  });
  const { data: classesData } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const r = await fetch("/api/classes", { credentials: "include" });
      if (!r.ok) return { classes: [] };
      return r.json();
    },
  });
  const { data: accountsData } = useQuery({
    queryKey: ["accounts-all"],
    queryFn: async () => {
      const r = await fetch("/api/accounts", { credentials: "include" });
      if (!r.ok) return { transactions: [], summary: { totalIncome: 0, totalExpense: 0, balance: 0 } };
      return r.json();
    },
  });
  const { data: payrollData } = useQuery({
    queryKey: ["payroll-all"],
    queryFn: async () => {
      const r = await fetch("/api/payroll", { credentials: "include" });
      if (!r.ok) return { payroll: [] };
      return r.json();
    },
  });
  const { data: attendanceData } = useQuery({
    queryKey: ["attendance-report"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const r = await fetch(`/api/attendance?startDate=${weekAgo}&endDate=${today}&limit=1000`, { credentials: "include" });
      if (!r.ok) return { attendance: [] };
      return r.json();
    },
  });

  const students = Array.isArray(studentsData?.students) ? studentsData.students : [];
  const payments = Array.isArray(feePaymentsData?.payments) ? feePaymentsData.payments : [];
  const feeStructures = Array.isArray(feeStructData?.structures) ? feeStructData.structures : Array.isArray(feeStructData?.feeStructures) ? feeStructData.feeStructures : [];
  const staff = Array.isArray(staffData?.staff) ? staffData.staff : [];
  const classes = Array.isArray(classesData?.classes) ? classesData.classes : [];
  const transactions = Array.isArray(accountsData?.transactions) ? accountsData.transactions : [];
  const summary = accountsData?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
  const payrollList = Array.isArray(payrollData) ? payrollData : (payrollData?.payroll || []);
  const attendanceRecords = Array.isArray(attendanceData?.attendance) ? attendanceData.attendance : [];

  // Derived stats
  const activeStudents = students.filter((s: any) => s.status === "active").length;
  const totalFeesPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalPayroll = payrollList.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);

  // Fee structures totals
  const totalFeesBilled = feeStructures.reduce((s: number, f: any) => s + (f.amount || 0), 0) * Math.max(activeStudents, 1);

  // Students by class
  const studentsByClass = classes.map((c: any) => ({
    label: c.name,
    value: students.filter((s: any) => s.classId === c.id).length,
  }));

  const maleCount = students.filter((s: any) => s.gender === "male").length;
  const femaleCount = students.filter((s: any) => s.gender === "female").length;

  // Payment methods breakdown
  const methodBreakdown: Record<string, number> = {};
  payments.forEach((p: any) => {
    methodBreakdown[p.paymentMethod || "Cash"] = (methodBreakdown[p.paymentMethod || "Cash"] || 0) + (p.amount || 0);
  });

  // Attendance this week
  const presentCount = attendanceRecords.filter((a: any) => a.status === "present").length;
  const absentCount = attendanceRecords.filter((a: any) => a.status === "absent").length;
  const lateCount = attendanceRecords.filter((a: any) => a.status === "late").length;
  const totalAttendance = attendanceRecords.length;
  const attendanceRate = totalAttendance ? Math.round((presentCount / totalAttendance) * 100) : 0;

  // Expense by category
  const expenseByCategory: Record<string, number> = {};
  transactions.filter((t: any) => t.type === "expense").forEach((t: any) => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
  });
  const expenseChart = Object.entries(expenseByCategory)
    .map(([label, value]) => ({ label, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const incomeByCategory: Record<string, number> = {};
  transactions.filter((t: any) => t.type === "income").forEach((t: any) => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
  });
  const incomeChart = Object.entries(incomeByCategory)
    .map(([label, value]) => ({ label, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ["#4ADE80", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA", "#34D399"];

  function printFullReport() {
    const classByClassRows = studentsByClass.map(c => `<tr><td>${c.label}</td><td>${c.value}</td></tr>`).join("");
    const paymentMethodRows = Object.entries(methodBreakdown).map(([m, v]) =>
      `<tr><td>${m}</td><td style="font-weight:600">${fmt(v)}</td></tr>`
    ).join("");
    const incomeRows = incomeChart.map(c => `<tr><td>${c.label}</td><td style="color:#065f46;font-weight:600">${fmt(c.value)}</td></tr>`).join("");
    const expenseRows = expenseChart.map(c => `<tr><td>${c.label}</td><td style="color:#991b1b;font-weight:600">${fmt(c.value)}</td></tr>`).join("");

    const html = `
      <div class="header">
        <div><div class="school-name">${SCHOOL_NAME}</div><div class="school-motto">${SCHOOL_MOTTO}</div></div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:700">FINANCIAL & SCHOOL SUMMARY</div><div style="font-size:12px;color:#6b7280">Report Date: ${new Date().toLocaleDateString("en-KE")}</div></div>
      </div>

      <div class="stat-grid">
        <div class="stat-box"><div class="stat-label">Active Students</div><div class="stat-value">${activeStudents}</div></div>
        <div class="stat-box"><div class="stat-label">Total Staff</div><div class="stat-value">${staff.length}</div></div>
        <div class="stat-box"><div class="stat-label">Classes</div><div class="stat-value">${classes.length}</div></div>
        <div class="stat-box"><div class="stat-label">Attendance Rate</div><div class="stat-value">${attendanceRate}%</div></div>
      </div>

      <div class="section">
        <div class="section-title">Financial Overview</div>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-label">Fees Collected</div><div class="stat-value" style="color:#065f46">${fmt(totalFeesPaid)}</div></div>
          <div class="stat-box"><div class="stat-label">Total Income</div><div class="stat-value" style="color:#065f46">${fmt(summary.totalIncome)}</div></div>
          <div class="stat-box"><div class="stat-label">Total Expenses</div><div class="stat-value" style="color:#991b1b">${fmt(summary.totalExpense)}</div></div>
          <div class="stat-box"><div class="stat-label">Net Balance</div><div class="stat-value" style="color:${summary.balance >= 0 ? "#065f46" : "#991b1b"}">${fmt(summary.balance)}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px">
          ${incomeChart.length ? `
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">Income by Category</div>
            <table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>${incomeRows}</tbody></table>
          </div>` : ""}
          ${expenseChart.length ? `
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">Expenses by Category</div>
            <table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>${expenseRows}</tbody></table>
          </div>` : ""}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Fee Collections</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">By Payment Method</div>
            <table><thead><tr><th>Method</th><th>Amount</th></tr></thead><tbody>${paymentMethodRows || '<tr><td colspan="2" style="color:#6b7280">No data</td></tr>'}</tbody>
            <tfoot><tr class="total-row"><td>Total</td><td>${fmt(totalFeesPaid)}</td></tr></tfoot></table>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">Payroll Summary</div>
            <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
              <tr><td>Total Staff Paid</td><td>${payrollList.filter((p: any) => p.status === "paid").length} / ${payrollList.length}</td></tr>
              <tr><td>Total Payroll</td><td style="font-weight:600">${fmt(totalPayroll)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Student Overview</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">Students by Class</div>
            <table><thead><tr><th>Class</th><th>Students</th></tr></thead>
            <tbody>${classByClassRows || '<tr><td colspan="2" style="color:#6b7280">No data</td></tr>'}</tbody>
            <tfoot><tr class="total-row"><td>Total</td><td>${students.length}</td></tr></tfoot></table>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;margin-bottom:8px">Gender Distribution</div>
            <table><thead><tr><th>Gender</th><th>Count</th><th>%</th></tr></thead><tbody>
              <tr><td>Male</td><td>${maleCount}</td><td>${students.length ? Math.round(maleCount / students.length * 100) : 0}%</td></tr>
              <tr><td>Female</td><td>${femaleCount}</td><td>${students.length ? Math.round(femaleCount / students.length * 100) : 0}%</td></tr>
            </tbody><tfoot><tr class="total-row"><td>Total</td><td>${students.length}</td><td>100%</td></tr></tfoot></table>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Attendance (Last 7 Days)</div>
        <table><thead><tr><th>Status</th><th>Count</th><th>%</th></tr></thead><tbody>
          <tr><td>Present</td><td>${presentCount}</td><td>${totalAttendance ? Math.round(presentCount / totalAttendance * 100) : 0}%</td></tr>
          <tr><td>Late</td><td>${lateCount}</td><td>${totalAttendance ? Math.round(lateCount / totalAttendance * 100) : 0}%</td></tr>
          <tr><td>Absent</td><td>${absentCount}</td><td>${totalAttendance ? Math.round(absentCount / totalAttendance * 100) : 0}%</td></tr>
        </tbody><tfoot><tr class="total-row"><td>Total</td><td>${totalAttendance}</td><td>—</td></tr></tfoot></table>
      </div>

      <div style="margin-top:32px;display:flex;justify-content:space-between;font-size:12px;color:#6b7280">
        <div>_______________________<br/>Prepared By</div>
        <div>_______________________<br/>Director / Head Teacher</div>
      </div>`;

    printHTML(html, `${SCHOOL_NAME} - Full School Report`);
  }

  return (
    <Layout>
      <div style={{ padding: "24px", maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Reports & Analytics</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>School overview at a glance</p>
          </div>
          <Button onClick={printFullReport}><Printer size={14} /> Print Full Report</Button>
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Active Students" value={fmtNum(activeStudents)} sub={`of ${fmtNum(students.length)} total`} color="var(--accent)" />
          <StatCard label="Total Staff" value={fmtNum(staff.length)} sub={`${classes.length} classes`} />
          <StatCard label="Fees Collected" value={fmt(totalFeesPaid)} sub={`${payments.length} payments`} color="#4ADE80" />
          <StatCard label="Attendance Rate" value={`${attendanceRate}%`} sub="this week" color={attendanceRate >= 80 ? "#4ADE80" : "#F87171"} />
        </div>

        {/* Finance Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Income" value={fmt(summary.totalIncome)} color="#4ADE80" />
          <StatCard label="Total Expenses" value={fmt(summary.totalExpense)} color="#F87171" />
          <StatCard label="Net Balance" value={fmt(summary.balance)} color={summary.balance >= 0 ? "#4ADE80" : "#F87171"} />
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Students by Class</h3>
              {studentsByClass.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No class data</div>
              ) : (
                <BarChart data={studentsByClass} colorFn={(i) => COLORS[i % COLORS.length]} />
              )}
            </div>
          </Card>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Fee Payments by Method</h3>
              {Object.keys(methodBreakdown).length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No payment data</div>
              ) : (
                <BarChart
                  data={Object.entries(methodBreakdown).map(([label, value]) => ({ label, value: value as number }))}
                  colorFn={(i) => COLORS[i % COLORS.length]}
                />
              )}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#4ADE80" }}>{fmt(totalFeesPaid)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Total Collected</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#60A5FA" }}>{payments.length}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Transactions</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Attendance This Week</h3>
              <BarChart
                data={[
                  { label: "Present", value: presentCount },
                  { label: "Late", value: lateCount },
                  { label: "Absent", value: absentCount },
                ]}
                colorFn={(i) => ["#4ADE80", "#FBBF24", "#F87171"][i]}
              />
              <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
                {fmtNum(totalAttendance)} attendance records this week
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Student Gender Split</h3>
              <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center", padding: "16px 0" }}>
                {[
                  { label: "Male", value: maleCount, color: "#60A5FA" },
                  { label: "Female", value: femaleCount, color: "#F472B6" },
                ].map((g) => (
                  <div key={g.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 40, fontWeight: 700, color: g.color }}>{fmtNum(g.value)}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {students.length ? Math.round((g.value / students.length) * 100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex" }}>
                <div style={{ flex: maleCount || 1, background: "#60A5FA" }} />
                <div style={{ flex: femaleCount || 1, background: "#F472B6" }} />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 3 — Finance breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Income by Category</h3>
              {incomeChart.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No income recorded</div>
              ) : (
                <BarChart data={incomeChart} colorFn={(i) => COLORS[i % COLORS.length]} />
              )}
            </div>
          </Card>
          <Card>
            <div style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Expenses by Category</h3>
              {expenseChart.length === 0 ? (
                <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>No expenses recorded</div>
              ) : (
                <BarChart data={expenseChart} colorFn={(i) => ["#F87171", "#FB923C", "#FBBF24", "#A78BFA", "#F472B6"][i % 5]} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
