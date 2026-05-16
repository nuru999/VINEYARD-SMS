import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { useRole } from "../lib/use-role";
import { Link } from "wouter";
import {
  CalendarCheck, BookOpen, ClipboardList, Calendar,
  Users, MessageSquare, Library, UserCircle
} from "lucide-react";

function StatCard({ label, value, icon, color = "#E91E8C" }: { label: string; value: any; icon: React.ReactNode; color?: string }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
      padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", lineHeight: 1.1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function QuickLink({ label, icon, path, color = "#E91E8C" }: { label: string; icon: React.ReactNode; path: string; color?: string }) {
  return (
    <Link href={path} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = color; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{label}</span>
      </div>
    </Link>
  );
}

export default function TeacherDashboard() {
  const { user } = useRole();
  const today = new Date().toISOString().split("T")[0];
  const dayName = new Date().toLocaleDateString("en-KE", { weekday: "long" });
  const fullDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Load classes to find teacher's assigned class
  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes", { credentials: "include" });
      if (!res.ok) return [];
      const r = await res.json();
      return Array.isArray(r) ? r : (r.classes ?? []);
    },
  });

  // Load staff to find current teacher record (admin-only endpoint — gracefully handle 403)
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) return [];
      const r = await res.json();
      return Array.isArray(r) ? r : (r.staff ?? []);
    },
  });

  // Match teacher by email
  const teacherRecord = (staffData ?? []).find((s: any) =>
    s.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  // Load timetable for today to show teacher's periods
  const { data: allSlots } = useQuery({
    queryKey: ["timetable-all"],
    queryFn: async () => {
      const res = await fetch("/api/timetable", { credentials: "include" });
      if (!res.ok) return [];
      const r = await res.json();
      return Array.isArray(r) ? r : (r.slots ?? r.timetable ?? []);
    },
  });

  // Filter today's slots for this teacher
  const todaySlots = (Array.isArray(allSlots) ? allSlots : []).filter(
    (s: any) => s.day === dayName && s.teacherId === teacherRecord?.id
  ).sort((a: any, b: any) => a.period - b.period);

  // Classes this teacher teaches
  const myClassIds = [...new Set((Array.isArray(allSlots) ? allSlots : [])
    .filter((s: any) => s.teacherId === teacherRecord?.id)
    .map((s: any) => s.classId))];

  const myClasses = (classesData ?? []).filter((c: any) => myClassIds.includes(c.id));

  // Load attendance stats for today
  const { data: attendanceData } = useQuery({
    queryKey: ["attendance-today", today],
    queryFn: async () => {
      const r = await fetch(`/api/attendance?date=${today}`, { credentials: "include" });
      return r.json();
    },
  });

  const todayAttendance = Array.isArray(attendanceData) ? attendanceData : (attendanceData?.attendance ?? []);
  const presentToday = todayAttendance.filter((a: any) => a.status === "present").length;
  const absentToday = todayAttendance.filter((a: any) => a.status === "absent").length;

  // Load exams
  const { data: examsData } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await fetch("/api/exams", { credentials: "include" });
      if (!res.ok) return [];
      const r = await res.json();
      return Array.isArray(r) ? r : (r.exams ?? []);
    },
  });

  const upcomingExams = (Array.isArray(examsData) ? examsData : [])
    .filter((e: any) => myClassIds.includes(e.classId) && e.startDate >= today)
    .sort((a: any, b: any) => a.startDate?.localeCompare(b.startDate))
    .slice(0, 3);

  const PERIOD_TIMES: Record<number, string> = {
    1: "7:30–8:15", 2: "8:15–9:00", 3: "9:00–9:45", 4: "9:45–10:30",
    5: "10:45–11:30", 6: "11:30–12:15", 7: "13:00–13:45", 8: "13:45–14:30",
  };

  return (
    <Layout title="My Dashboard">
      {/* Welcome */}
      <div style={{
        background: "linear-gradient(135deg, #1B4D4D 0%, #0f2e2e 100%)",
        borderRadius: 16, padding: "24px 28px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 20px rgba(27,77,77,0.3)",
      }}>
        <div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{fullDate}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", marginBottom: 4 }}>
            Welcome back, {user?.name?.split(" ")[0] ?? "Teacher"} 👋
          </div>
          {teacherRecord && (
            <div style={{ fontSize: 13, color: "rgba(233,30,140,0.9)", fontWeight: 600 }}>
              {teacherRecord.designation} · {teacherRecord.department || "Vineyard Primary"}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>My Classes</div>
          {myClasses.length > 0 ? myClasses.map((c: any) => (
            <div key={c.id} style={{ fontSize: 13, color: "#4ADE80", fontWeight: 600 }}>{c.name}</div>
          )) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No class assigned</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Present Today" value={presentToday || "—"} icon={<CalendarCheck size={20} />} color="#4ADE80" />
        <StatCard label="Absent Today" value={absentToday || "—"} icon={<Users size={20} />} color="#F85149" />
        <StatCard label="My Classes" value={myClasses.length || "—"} icon={<BookOpen size={20} />} color="#E91E8C" />
        <StatCard label="Periods Today" value={todaySlots.length || "—"} icon={<Calendar size={20} />} color="#E3B341" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Today's Schedule */}
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Today's Schedule</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>{dayName}</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {todaySlots.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                {teacherRecord ? "No classes scheduled today" : "Link your staff profile to see schedule"}
              </div>
            ) : todaySlots.map((slot: any) => {
              const cls = (classesData ?? []).find((c: any) => c.id === slot.classId);
              return (
                <div key={slot.id} style={{
                  padding: "10px 18px", display: "flex", alignItems: "center", gap: 12,
                  borderBottom: "1px solid #F1F5F9",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: "rgba(233,30,140,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#E91E8C", flexShrink: 0,
                  }}>P{slot.period}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{slot.subject}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{cls?.name ?? `Class ${slot.classId}`} · {PERIOD_TIMES[slot.period]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Exams */}
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Upcoming Exams</span>
            <Link href="/exams" style={{ fontSize: 11, color: "#E91E8C", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ padding: "8px 0" }}>
            {upcomingExams.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No upcoming exams</div>
            ) : upcomingExams.map((exam: any) => {
              const cls = (classesData ?? []).find((c: any) => c.id === exam.classId);
              return (
                <div key={exam.id} style={{ padding: "12px 18px", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{exam.name}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    {cls?.name} · {exam.startDate} {exam.term ? `· ${exam.term}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Quick Access</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <QuickLink label="Mark Attendance" icon={<CalendarCheck size={18} />} path="/attendance" color="#4ADE80" />
          <QuickLink label="Timetable" icon={<Calendar size={18} />} path="/timetable" color="#E3B341" />
          <QuickLink label="Exams & Results" icon={<ClipboardList size={18} />} path="/exams" color="#E91E8C" />
          <QuickLink label="Students" icon={<Users size={18} />} path="/students" color="#60A5FA" />
          <QuickLink label="Library" icon={<Library size={18} />} path="/library" color="#A78BFA" />
          <QuickLink label="Messages" icon={<MessageSquare size={18} />} path="/communication" color="#34D399" />
          <QuickLink label="My Profile" icon={<UserCircle size={18} />} path="/profile" color="#FB923C" />
        </div>
      </div>
    </Layout>
  );
}
