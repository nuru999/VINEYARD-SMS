import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { Link } from "wouter";
import { Building2, Users, BookOpen, CalendarCheck, ClipboardList, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

function Card({ label, value, icon, color = "#E91E8C" }: { label: string; value: any; icon: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1E293B" }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}

export default function PrincipalDashboard() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.dashboard.stats.$get()).json(),
  });
  const classes = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.classes.$get()).json(),
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch("/api/me/users", { credentials: "include" });
      if (!r.ok) return { users: [] };
      return r.json();
    },
  });

  const s = (stats.data as any)?.stats;
  const classList = (classes.data as any)?.classes ?? [];
  const teacherCount = (users.data as any)?.users?.filter((u: any) => u.role === "teacher").length ?? 0;

  return (
    <Layout title="Principal Dashboard">
      <div style={{ marginBottom: 20, background: "linear-gradient(135deg,#1B4D4D,#0f2e2e)", color: "#fff", borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>School oversight</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>Principal overview</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Read everything. Manage nothing.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <Card label="Students" value={s?.totalStudents} icon={<Users size={20} />} color="#E91E8C" />
        <Card label="Classes" value={classList.length} icon={<BookOpen size={20} />} color="#F59E0B" />
        <Card label="Teachers" value={teacherCount} icon={<ShieldCheck size={20} />} color="#3B82F6" />
        <Card label="Attendance Today" value={s?.attendanceMarked ? "Marked" : "Pending"} icon={<CalendarCheck size={20} />} color="#22C55E" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>Quick Links</div>
          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/students">Students</Link>
            <Link href="/classes">Classes</Link>
            <Link href="/attendance">Attendance</Link>
            <Link href="/exams">Exams</Link>
            <Link href="/reports">Reports</Link>
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>School snapshot</div>
          <div style={{ fontSize: 14, color: "#1E293B", lineHeight: 1.8 }}>
            <div>Teachers assigned to classes: {teacherCount ? "Yes" : "No"}</div>
            <div>Classes configured: {classList.length}</div>
            <div>Use admin pages for setup and principal pages for oversight.</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
