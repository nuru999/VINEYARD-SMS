import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Card } from "../components/ui/card";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("en-KE").format(n);

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
            <div
              style={{
                height: "100%",
                width: `${(d.value / max) * 100}%`,
                borderRadius: 4,
                background: colorFn ? colorFn(i) : "var(--accent)",
                transition: "width 0.5s ease",
              }}
            />
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
      return r.json();
    },
  });
  const { data: feesData } = useQuery({
    queryKey: ["fees-all"],
    queryFn: async () => {
      const r = await fetch("/api/fees?limit=1000", { credentials: "include" });
      return r.json();
    },
  });
  const { data: staffData } = useQuery({
    queryKey: ["staff-all"],
    queryFn: async () => {
      const r = await fetch("/api/staff?limit=1000", { credentials: "include" });
      return r.json();
    },
  });
  const { data: classesData } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const r = await fetch("/api/classes", { credentials: "include" });
      return r.json();
    },
  });
  const { data: accountsData } = useQuery({
    queryKey: ["accounts-all"],
    queryFn: async () => {
      const r = await fetch("/api/accounts", { credentials: "include" });
      return r.json();
    },
  });
  const { data: attendanceData } = useQuery({
    queryKey: ["attendance-report"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const r = await fetch(`/api/attendance?startDate=${weekAgo}&endDate=${today}&limit=1000`, { credentials: "include" });
      return r.json();
    },
  });

  const students = studentsData?.students || [];
  const fees = feesData?.fees || [];
  const staff = staffData?.staff || [];
  const classes = classesData?.classes || [];
  const transactions = accountsData?.transactions || [];
  const summary = accountsData?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
  const attendanceRecords = attendanceData?.attendance || [];

  // Derived stats
  const activeStudents = students.filter((s: any) => s.status === "active").length;
  const totalFeesPaid = fees.filter((f: any) => f.status === "paid").reduce((sum: number, f: any) => sum + f.amount, 0);
  const totalFeesPending = fees.filter((f: any) => f.status === "pending" || f.status === "partial").reduce((sum: number, f: any) => sum + (f.balance || f.amount), 0);
  const feeCollectionRate = fees.length ? Math.round((fees.filter((f: any) => f.status === "paid").length / fees.length) * 100) : 0;

  // Students by class
  const studentsByClass = classes.map((c: any) => ({
    label: c.name,
    value: students.filter((s: any) => s.classId === c.id).length,
  }));

  // Students by gender
  const maleCount = students.filter((s: any) => s.gender === "male").length;
  const femaleCount = students.filter((s: any) => s.gender === "female").length;

  // Fee status breakdown
  const feeStatus = [
    { label: "Paid", value: fees.filter((f: any) => f.status === "paid").length },
    { label: "Partial", value: fees.filter((f: any) => f.status === "partial").length },
    { label: "Pending", value: fees.filter((f: any) => f.status === "pending").length },
  ];

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

  // Income by category
  const incomeByCategory: Record<string, number> = {};
  transactions.filter((t: any) => t.type === "income").forEach((t: any) => {
    incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
  });
  const incomeChart = Object.entries(incomeByCategory)
    .map(([label, value]) => ({ label, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ["#4ADE80", "#60A5FA", "#F472B6", "#FBBF24", "#A78BFA", "#34D399"];

  return (
    <Layout>
      <div style={{ padding: "24px", maxWidth: 1200 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Reports & Analytics</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>School overview at a glance</p>
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Active Students" value={fmtNum(activeStudents)} sub={`of ${fmtNum(students.length)} total`} color="var(--accent)" />
          <StatCard label="Total Staff" value={fmtNum(staff.length)} sub={`${classes.length} classes`} />
          <StatCard label="Fee Collection Rate" value={`${feeCollectionRate}%`} sub="paid invoices" color={feeCollectionRate >= 75 ? "#4ADE80" : "#FBBF24"} />
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
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Fee Payment Status</h3>
              <BarChart
                data={feeStatus}
                colorFn={(i) => ["#4ADE80", "#FBBF24", "#F87171"][i]}
              />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#4ADE80" }}>{fmt(totalFeesPaid)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Collected</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#F87171" }}>{fmt(totalFeesPending)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Outstanding</div>
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
                <BarChart data={incomeChart.map((d) => ({ ...d, value: d.value }))} colorFn={(i) => COLORS[i % COLORS.length]} />
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
