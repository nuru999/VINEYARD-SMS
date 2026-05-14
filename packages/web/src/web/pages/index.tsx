import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, BookOpen, DollarSign, TrendingUp, TrendingDown, Activity, AlertCircle, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Layout } from "../components/layout";
import { StatCard } from "../components/ui/card";
import { api } from "../lib/api";

function DefaultersList() {
  const { data, isLoading } = useQuery({
    queryKey: ["fee-defaulters"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments/defaulters", { credentials: "include" });
      return r.json();
    },
  });

  if (isLoading) return <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>;
  if (!data?.defaulters?.length) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
      <AlertCircle size={28} style={{ marginBottom: 6, opacity: 0.3 }} />
      <div>No defaulters</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.defaulters.slice(0, 5).map((d: any) => (
        <div key={d.student?.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderRadius: 8, background: "rgba(248,81,73,0.05)",
          border: "1px solid rgba(248,81,73,0.15)",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{d.student?.name || "Unknown"}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.class?.name || ""} · {d.student?.parentPhone || "No phone"}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F85149" }}>KES {d.totalOwed?.toLocaleString()}</span>
        </div>
      ))}
      {data.defaulters.length > 5 && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", paddingTop: 4 }}>
          +{data.defaulters.length - 5} more
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.dashboard.stats.$get()).json(),
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.students.$get()).json(),
  });

  const recentPayments = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => (await api["fee-payments"].$get()).json(),
  });

  const s = stats.data?.stats;

  return (
    <Layout title="Dashboard">
      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 96, background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", animation: "pulse 1.5s infinite" }} />
          ))
        ) : (
          <>
            <StatCard label="Total Students" value={s?.totalStudents ?? 0} icon={<Users size={20} />} />
            <StatCard label="Total Staff" value={s?.totalStaff ?? 0} icon={<UserCheck size={20} />} color="#58A6FF" />
            <StatCard label="Classes" value={s?.totalClasses ?? 0} icon={<BookOpen size={20} />} color="#E3B341" />
            <StatCard label="Total Revenue" value={`KES ${(s?.totalRevenue ?? 0).toLocaleString()}`} icon={<DollarSign size={20} />} />
            <StatCard label="Income" value={`KES ${(s?.totalIncome ?? 0).toLocaleString()}`} icon={<TrendingUp size={20} />} color="#3FB950" />
            <StatCard label="Expenses" value={`KES ${(s?.totalExpenses ?? 0).toLocaleString()}`} icon={<TrendingDown size={20} />} color="#F85149" />
            <StatCard label="Fee Defaulters" value={s?.defaulterCount ?? 0} icon={<AlertTriangle size={20} />} color="#F85149" />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Recent Students */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Recent Students</h3>
            <Activity size={16} color="var(--text-secondary)" />
          </div>
          {students.isLoading ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
          ) : students.data?.students?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)", fontSize: 13 }}>
              <AlertCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No students yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {students.data?.students?.slice(0, 6).map((student: any) => (
                <div key={student.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{student.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{student.admissionNo}</div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                    background: "rgba(74,222,128,0.12)", color: "var(--accent)",
                  }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Defaulters */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Fee Defaulters</h3>
            <Link href="/fees" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
          </div>
          <DefaultersList />
        </div>

        {/* Recent Payments */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Recent Payments</h3>
            <DollarSign size={16} color="var(--text-secondary)" />
          </div>
          {recentPayments.isLoading ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
          ) : recentPayments.data?.payments?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-secondary)", fontSize: 13 }}>
              <AlertCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No payments yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentPayments.data?.payments?.slice(0, 6).map((p: any) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{p.receiptNo}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{p.paymentDate}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>KES {p.paidAmount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
