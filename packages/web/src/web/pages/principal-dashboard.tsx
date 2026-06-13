import { useQuery } from "@tanstack/react-query";
import principalPic from "../assets/principal-pic.jpg";
import { Suspense } from "react";
import { Layout } from "../components/layout";
import { Link } from "wouter";
import { Users, BookOpen, CalendarCheck, ClipboardList, ShieldCheck, School2, CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
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

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{ padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10, color: "#1E293B", fontWeight: 600 }}>
        {label}
      </div>
    </Link>
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
  const principals = (users.data as any)?.users?.filter((u: any) => u.role === "principal").length ?? 0;
  const classesWithTeachers = useMemo(() => classList.map((c: any) => ({
    ...c,
    teacherName: c.teacherName ?? (users.data as any)?.users?.find((u: any) => u.id === c.teacherUserId)?.name ?? "Unassigned",
  })), [classList, users.data]);

  return (
    <Layout title="Principal Dashboard">
      {/* Full-page background photo */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <img src={principalPic} alt="" style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
          opacity: 0.07,
        }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ marginBottom: 20, background: "linear-gradient(135deg,#1B4D4D,#0f2e2e)", color: "#fff", borderRadius: 16, padding: 24, position: "relative", overflow: "hidden" }}>
        {/* School photo */}
        <img src={principalPic} alt="School" style={{
          position: "absolute", top: 0, right: 0, height: "100%", width: 260,
          objectFit: "cover", objectPosition: "center", opacity: 0.22,
          borderRadius: "0 16px 16px 0",
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 280,
          background: "linear-gradient(to right, #1B4D4D 0%, transparent 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>School oversight</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Principal overview</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Read everything. Guide the school. No setup actions.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <Card label="Students" value={s?.totalStudents} icon={<Users size={20} />} color="#E91E8C" />
        <Card label="Classes" value={classList.length} icon={<BookOpen size={20} />} color="#F59E0B" />
        <Card label="Teachers" value={teacherCount} icon={<ShieldCheck size={20} />} color="#3B82F6" />
        <Card label="Principals" value={principals} icon={<School2 size={20} />} color="#8B5CF6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>Quick Access</div>
          <div style={{ display: "grid", gap: 10 }}>
            <QuickAction href="/students" label="Students" />
            <QuickAction href="/classes" label="Classes" />
            <QuickAction href="/attendance" label="Attendance" />
            <QuickAction href="/exams" label="Exams" />
            <QuickAction href="/report-cards" label="Report Cards" />
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>Oversight</div>
          <div style={{ fontSize: 14, color: "#1E293B", lineHeight: 1.8 }}>
            <div>Teachers assigned to classes: {teacherCount}</div>
            <div>Classes configured: {classList.length}</div>
            <div>School data remains under admin control.</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 12 }}>Classes per teacher</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={{ padding: 10, textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "#64748B" }}>Class</th>
              <th style={{ padding: 10, textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "#64748B" }}>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {classesWithTeachers.map((c: any) => (
              <tr key={c.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                <td style={{ padding: 10, fontWeight: 600, color: "#1E293B" }}>{c.name}</td>
                <td style={{ padding: 10, color: c.teacherName === "Unassigned" ? "#94A3B8" : "#1E293B" }}>{c.teacherName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>{/* end zIndex wrapper */}
    </Layout>
  );
}
