import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Save } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select } from "../components/ui/input";
import { api } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState("");
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => { const r = await (await api.classes.$get()).json(); return (r as any).classes ?? r; },
  });

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; },
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["attendance"],
    queryFn: async () => (await api.attendance.$get()).json(),
  });

  const filtered = studentsData?.students?.filter((s: any) =>
    classId ? String(s.classId) === classId : true
  ) || [];

  const markAll = (status: string) => {
    const m: Record<number, string> = {};
    filtered.forEach((s: any) => { m[s.id] = status; });
    setMarks(m);
  };

  const saveAttendance = useMutation({
    mutationFn: async () => {
      const records = filtered.map((s: any) => ({
        studentId: s.id,
        classId: parseInt(classId || "0") || s.classId,
        date,
        status: marks[s.id] || "present",
      }));
      return (await api.attendance.$post({ json: records })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  const statusOptions = ["present", "absent", "late", "leave"];

  return (
    <Layout title="Attendance">
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: "9px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "Poppins", outline: "none" }} />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Filter by Class" value={classId} onChange={e => setClassId(e.target.value)}
            options={(classesData?.classes || []).map((c: any) => ({ value: String(c.id), label: c.name }))} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => markAll("present")}>All Present</Button>
          <Button variant="danger" size="sm" onClick={() => markAll("absent")}>All Absent</Button>
        </div>
        <Button onClick={() => saveAttendance.mutate()} loading={saveAttendance.isPending} style={{ marginLeft: "auto" }}>
          <Save size={14} /> {saved ? "Saved!" : "Save Attendance"}
        </Button>
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Adm No", "Student Name", "Status"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-secondary)" }}>Loading students...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                <CalendarCheck size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
                Select a class to mark attendance
              </td></tr>
            ) : filtered.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{s.admissionNo}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.name}</td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {statusOptions.map(status => (
                      <button key={status} onClick={() => setMarks({ ...marks, [s.id]: status })}
                        style={{
                          padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: "1px solid",
                          cursor: "pointer", textTransform: "capitalize", fontFamily: "Poppins",
                          ...(marks[s.id] === status
                            ? status === "present" ? { background: "rgba(63,185,80,0.2)", borderColor: "#3FB950", color: "#3FB950" }
                              : status === "absent" ? { background: "rgba(248,81,73,0.2)", borderColor: "#F85149", color: "#F85149" }
                              : status === "late" ? { background: "rgba(227,179,65,0.2)", borderColor: "#E3B341", color: "#E3B341" }
                              : { background: "rgba(139,148,158,0.2)", borderColor: "#64748B", color: "#64748B" }
                            : { background: "transparent", borderColor: "var(--border)", color: "var(--text-secondary)" })
                        }}>
                        {status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Attendance Log */}
      {attendanceData?.attendance?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>RECENT ATTENDANCE LOG</h3>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Student ID", "Date", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceData.attendance.slice(-10).reverse().map((a: any) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>#{a.studentId}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{a.date}</td>
                    <td style={{ padding: "10px 16px" }}><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
