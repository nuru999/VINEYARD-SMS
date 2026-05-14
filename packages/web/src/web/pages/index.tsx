import { useQuery } from "@tanstack/react-query";
import {
  Users, UserCheck, BookOpen, DollarSign, TrendingUp, TrendingDown,
  AlertCircle, AlertTriangle, CalendarCheck, UserX, Clock,
  MessageCircle, GraduationCap, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { Layout } from "../components/layout";
import { api } from "../lib/api";

// ── Mini stat card ──────────────────────────────────────────────────────────
function Stat({ label, value, icon, color = "var(--accent)", sub }: {
  label: string; value: any; icon: React.ReactNode; color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)",
      padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h3>
      {link && <Link href={link} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>{linkLabel || "View all →"}</Link>}
    </div>
  );
}

// ── Defaulters widget ───────────────────────────────────────────────────────
function DefaultersList() {
  const { data, isLoading } = useQuery({
    queryKey: ["fee-defaulters"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments/defaulters", { credentials: "include" });
      return r.json();
    },
  });
  if (isLoading) return <div style={{ color: "var(--text-secondary)", fontSize: 13, padding: "12px 0" }}>Loading...</div>;
  if (!data?.defaulters?.length) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
      <CheckCircle2 size={28} style={{ marginBottom: 6, color: "#3FB950", opacity: 0.5 }} />
      <div>All fees cleared</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {data.defaulters.slice(0, 5).map((d: any) => (
        <div key={d.student?.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: 9, background: "rgba(248,81,73,0.05)",
          border: "1px solid rgba(248,81,73,0.12)",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{d.student?.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.class?.name} · {d.student?.parentPhone || "—"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#F85149" }}>KES {d.totalOwed?.toLocaleString()}</span>
            {d.student?.parentPhone && (
              <a href={`https://wa.me/${d.student.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${d.student.parentName || "Parent"}, ${d.student.name} has an outstanding fee balance of KES ${d.totalOwed?.toLocaleString()} at Vineyard Primary School.`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: "#25D366", color: "#fff", borderRadius: 6, padding: "3px 7px", fontSize: 11, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                <MessageCircle size={10} /> WA
              </a>
            )}
          </div>
        </div>
      ))}
      {data.defaulters.length > 5 && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", paddingTop: 2 }}>+{data.defaulters.length - 5} more</div>
      )}
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────────
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
  const loading = stats.isLoading;

  return (
    <Layout title="Dashboard">

      {/* ── School Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #1B4D4D 0%, #0f2e2e 60%, #1a0d2e 100%)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        border: "1px solid rgba(233,30,140,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 200, height: 200,
          borderRadius: "50%", background: "rgba(233,30,140,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -30, right: 80, width: 120, height: 120,
          borderRadius: "50%", background: "rgba(233,30,140,0.05)",
        }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <GraduationCap size={22} color="#E91E8C" />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>Vineyard Primary School</span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Fruitful Development</div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{
              background: "rgba(233,30,140,0.2)", border: "1px solid rgba(233,30,140,0.4)",
              color: "#E91E8C", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20,
            }}>
              {loading ? "—" : s?.currentTerm} {loading ? "" : s?.currentYear}
            </span>
            <span style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "4px 14px", borderRadius: 20,
            }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#E91E8C", lineHeight: 1 }}>
            {loading ? "—" : s?.totalStudents}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>enrolled students</div>
        </div>
      </div>

      {/* ── Today's Attendance Strip ── */}
      <div style={{
        background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)",
        padding: "14px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarCheck size={16} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Today's Attendance</span>
          {!loading && !s?.attendanceMarked && (
            <span style={{ fontSize: 11, background: "rgba(227,179,65,0.15)", color: "#E3B341", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
              Not Marked
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 20, flex: 1, flexWrap: "wrap" }}>
          {[
            { label: "Present", value: s?.presentToday ?? 0, color: "#3FB950", icon: <CheckCircle2 size={14} /> },
            { label: "Absent", value: s?.absentToday ?? 0, color: "#F85149", icon: <UserX size={14} /> },
            { label: "Late", value: s?.lateToday ?? 0, color: "#E3B341", icon: <Clock size={14} /> },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{loading ? "—" : item.value}</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.label}</span>
            </div>
          ))}
        </div>
        <Link href="/attendance" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap" }}>
          Mark Attendance →
        </Link>
      </div>

      {/* ── Key Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Total Students" value={loading ? "—" : s?.totalStudents} icon={<Users size={20} />} color="var(--accent)" />
        <Stat label="Active Staff" value={loading ? "—" : s?.totalStaff} icon={<UserCheck size={20} />} color="#58A6FF" />
        <Stat label="Classes" value={loading ? "—" : s?.totalClasses} icon={<BookOpen size={20} />} color="#E3B341" />
        <Stat label="Fees Collected" value={loading ? "—" : `KES ${(s?.totalRevenue ?? 0).toLocaleString()}`} icon={<DollarSign size={20} />} color="var(--accent)" />
        <Stat label="Outstanding Fees" value={loading ? "—" : `KES ${(s?.totalOutstanding ?? 0).toLocaleString()}`} icon={<AlertTriangle size={20} />} color="#F85149"
          sub={`${loading ? 0 : s?.defaulterCount} defaulters`} />
        <Stat label="Net Balance" value={loading ? "—" : `KES ${((s?.netBalance ?? 0)).toLocaleString()}`}
          icon={(s?.netBalance ?? 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          color={(s?.netBalance ?? 0) >= 0 ? "#3FB950" : "#F85149"} />
      </div>

      {/* ── Bottom Panels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>

        {/* Recent Students */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <SectionHeader title="Recent Students" link="/students" />
          {students.isLoading ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
          ) : !students.data?.students?.length ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
              <AlertCircle size={28} style={{ marginBottom: 6, opacity: 0.3 }} />
              <div>No students yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {students.data.students.slice(0, 6).map((student: any) => (
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
          <SectionHeader title="Fee Defaulters" link="/fees" />
          <DefaultersList />
        </div>

        {/* Recent Payments */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
          <SectionHeader title="Recent Payments" link="/fees" />
          {recentPayments.isLoading ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
          ) : !recentPayments.data?.payments?.length ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)", fontSize: 13 }}>
              <AlertCircle size={28} style={{ marginBottom: 6, opacity: 0.3 }} />
              <div>No payments yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {recentPayments.data.payments.slice(-6).reverse().map((p: any) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{p.receiptNo}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{p.paymentDate}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3FB950" }}>KES {p.paidAmount?.toLocaleString()}</div>
                    {p.balance > 0 && <div style={{ fontSize: 10, color: "#F85149" }}>Bal: {p.balance?.toLocaleString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
