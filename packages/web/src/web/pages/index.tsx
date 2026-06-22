import { useQuery } from "@tanstack/react-query";
import adminPic from "../assets/admin-pic.jpg";
import {
  Users, UserCheck, BookOpen, DollarSign, TrendingUp, TrendingDown,
  AlertCircle, AlertTriangle, CalendarCheck, UserX, Clock,
  MessageCircle, GraduationCap, CheckCircle2, BarChart2
} from "lucide-react";
import { Link } from "wouter";
import { Layout } from "../components/layout";
import { api } from "../lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";

// ── Mini stat card ──────────────────────────────────────────────────────────
function Stat({ label, value, icon, color = "#E91E8C", sub }: {
  label: string; value: any; icon: React.ReactNode; color?: string; sub?: string;
}) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
      padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)")}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: String(value).length > 12 ? 14 : String(value).length > 8 ? 17 : 22, fontWeight: 800, color: "#1E293B", lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, link, linkLabel }: { title: string; link?: string; linkLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h3 style={{
        margin: 0, fontSize: 12, fontWeight: 700, color: "#94A3B8",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>{title}</h3>
      {link && (
        <Link href={link} style={{ fontSize: 12, color: "#E91E8C", textDecoration: "none", fontWeight: 600 }}>
          {linkLabel || "View all →"}
        </Link>
      )}
    </div>
  );
}

// ── Chart card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, children, height = 220 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

// Custom tooltip for fee charts
function FeeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>KES {(p.value ?? 0).toLocaleString("en-KE")}</strong>
        </div>
      ))}
    </div>
  );
}

// Custom tooltip for attendance pie
function AttTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <span style={{ color: d.payload.color, fontWeight: 700 }}>{d.name}: </span>
      <strong>{d.value}</strong> records
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
  if (isLoading) return <div style={{ color: "#94A3B8", fontSize: 13, padding: "12px 0" }}>Loading...</div>;
  if (!data?.defaulters?.length) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 13 }}>
      <CheckCircle2 size={28} style={{ marginBottom: 6, color: "#22C55E", opacity: 0.6 }} />
      <div>All fees cleared</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {data.defaulters.slice(0, 5).map((d: any) => (
        <div key={d.student?.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 12px", borderRadius: 9, background: "#FEF2F2",
          border: "1px solid #FECACA",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{d.student?.name}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{d.class?.name} · {d.student?.parentPhone || "—"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}>KES {d.totalOwed?.toLocaleString()}</span>
            {d.student?.parentPhone && d.student.parentPhone.replace(/\D/g, "").length > 6 && (
              <a href={`https://wa.me/${d.student.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${d.student.parentName || "Parent"}, ${d.student.name} has an outstanding fee balance of KES ${d.totalOwed?.toLocaleString()} at Vineyard Primary School.`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  background: "#25D366", color: "#fff", borderRadius: 6, padding: "3px 7px",
                  fontSize: 11, textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
                }}>
                <MessageCircle size={10} /> WA
              </a>
            )}
          </div>
        </div>
      ))}
      {data.defaulters.length > 5 && (
        <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", paddingTop: 2 }}>
          +{data.defaulters.length - 5} more
        </div>
      )}
    </div>
  );
}

// ── Analytics Charts Section ─────────────────────────────────────────────
function AnalyticsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard/analytics", { credentials: "include" });
      return r.json();
    },
  });

  const hasData = !isLoading && data;
  const noFeeData = !data?.feesByTerm?.length && !data?.monthlyFees?.length;
  const noAttData = !data?.attendancePie?.length;
  const noClassData = !data?.classStudents?.length;

  return (
    <div style={{ marginTop: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <BarChart2 size={16} color="#E91E8C" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Analytics Overview
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

        {/* Monthly fee collection — Line chart */}
        <ChartCard title="Monthly Fee Collection" height={220}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : noFeeData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>No payment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyFees} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<FeeTooltip />} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="#E91E8C" strokeWidth={2.5} dot={{ fill: "#E91E8C", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Fees per term — Bar chart */}
        <ChartCard title="Fees by Term" height={220}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : noFeeData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>No payment data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.feesByTerm} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="term" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<FeeTooltip />} />
                <Bar dataKey="collected" name="Collected" fill="#1B4D4D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#FCA5A5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

        {/* Students per class — Bar chart */}
        <ChartCard title="Students per Class" height={220}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : noClassData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>No class data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.classStudents} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="class" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v: any) => [`${v} students`, "Count"]} />
                <Bar dataKey="students" fill="#E91E8C" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Attendance breakdown — Pie chart */}
        <ChartCard title="Attendance Breakdown" height={220}>
          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : noAttData ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94A3B8", fontSize: 13 }}>No attendance data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.attendancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {data.attendancePie.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<AttTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>
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
    queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; },
  });
  const recentPayments = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => { const r = await (await api["fee-payments"].$get()).json(); return (r as any).payments ? r : { payments: r }; },
  });

  const s = stats.data?.stats;
  const loading = stats.isLoading;

  return (
    <Layout title="Dashboard">
      {/* Full-page background photo */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <img src={adminPic} alt="" style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
          opacity: 0.07,
        }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>

      {/* ── School Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #1B4D4D 0%, #0f3333 100%)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", overflow: "hidden",
        boxShadow: "0 4px 20px rgba(27,77,77,0.25)",
      }}>
        <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(233,30,140,0.08)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 100, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #E91E8C, #ff6ecb)" }} />
        <img src={adminPic} alt="School" style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 260, objectFit: "cover", objectPosition: "center", opacity: 0.22, borderRadius: "0 16px 16px 0" }} />
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 280, background: "linear-gradient(to right, #1B4D4D 0%, transparent 100%)", borderRadius: "0 16px 16px 0" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <GraduationCap size={20} color="#E91E8C" />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>Vineyard Primary School</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>Fruitful Development</div>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ background: "rgba(233,30,140,0.25)", border: "1px solid rgba(233,30,140,0.5)", color: "#f9a8d4", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>
              {loading ? "—" : s?.currentTerm} {loading ? "" : s?.currentYear}
            </span>
            <span style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "4px 14px", borderRadius: 20 }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: "#E91E8C", lineHeight: 1 }}>{loading ? "—" : s?.totalStudents}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>enrolled students</div>
        </div>
      </div>

      {/* ── Today's Attendance Strip ── */}
      <div style={{
        background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0",
        padding: "14px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarCheck size={16} color="#E91E8C" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Today's Attendance</span>
          {!loading && !s?.attendanceMarked && (
            <span style={{ fontSize: 11, background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>Not Marked</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 20, flex: 1, flexWrap: "wrap" }}>
          {[
            { label: "Present", value: s?.presentToday ?? 0, color: "#22C55E", icon: <CheckCircle2 size={14} /> },
            { label: "Absent", value: s?.absentToday ?? 0, color: "#EF4444", icon: <UserX size={14} /> },
            { label: "Late", value: s?.lateToday ?? 0, color: "#F59E0B", icon: <Clock size={14} /> },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{loading ? "—" : item.value}</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>{item.label}</span>
            </div>
          ))}
        </div>
        <Link href="/attendance" style={{ fontSize: 12, color: "#E91E8C", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
          Mark Attendance →
        </Link>
      </div>

      {/* ── Key Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Stat label="Total Students" value={loading ? "—" : s?.totalStudents} icon={<Users size={20} />} color="#E91E8C" />
        <Stat label="Active Staff" value={loading ? "—" : s?.totalStaff} icon={<UserCheck size={20} />} color="#3B82F6" />
        <Stat label="Classes" value={loading ? "—" : s?.totalClasses} icon={<BookOpen size={20} />} color="#F59E0B" />
        <Stat label="Fees Collected" value={loading ? "—" : `KES ${(s?.totalRevenue ?? 0).toLocaleString()}`} icon={<DollarSign size={20} />} color="#22C55E" />
        <Stat label="Outstanding Fees" value={loading ? "—" : `KES ${(s?.totalOutstanding ?? 0).toLocaleString()}`} icon={<AlertTriangle size={20} />} color="#EF4444"
          sub={`${loading ? 0 : s?.defaulterCount} defaulters`} />
        <Stat label="Net Balance" value={loading ? "—" : `KES ${((s?.netBalance ?? 0)).toLocaleString()}`}
          icon={(s?.netBalance ?? 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          color={(s?.netBalance ?? 0) >= 0 ? "#22C55E" : "#EF4444"} />
      </div>

      {/* ── Bottom Panels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        {/* Recent Students */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Recent Students" link="/students" />
          {students.isLoading ? (
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : !(students.data as any)?.length ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 13 }}>
              <AlertCircle size={28} style={{ marginBottom: 6, opacity: 0.3 }} />
              <div>No students yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {(students.data as any).slice(0, 6).map((student: any) => (
                <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{student.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{student.admissionNo}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#16A34A" }}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Defaulters */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Fee Defaulters" link="/fees" />
          <DefaultersList />
        </div>

        {/* Recent Payments */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <SectionHeader title="Recent Payments" link="/fees" />
          {recentPayments.isLoading ? (
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Loading...</div>
          ) : !(Array.isArray(recentPayments.data) ? recentPayments.data : (recentPayments.data as any)?.payments ?? []).length ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 13 }}>
              <AlertCircle size={28} style={{ marginBottom: 6, opacity: 0.3 }} />
              <div>No payments yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {(Array.isArray(recentPayments.data) ? recentPayments.data : (recentPayments.data as any)?.payments ?? []).slice(-6).reverse().map((p: any) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{p.receiptNo}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{p.paymentDate}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>KES {p.paidAmount?.toLocaleString()}</div>
                    {p.balance > 0 && <div style={{ fontSize: 10, color: "#EF4444" }}>Bal: {p.balance?.toLocaleString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Analytics Charts ── */}
      <AnalyticsSection />

      </div>{/* end zIndex wrapper */}
    </Layout>
  );
}
