import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { CalendarCheck, Save } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select } from "../components/ui/input";
import { api } from "../lib/api";

const today = new Date().toISOString().slice(0, 10);

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState("");
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: classesData, isError: classesError } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const result = await parseResponse(await api.classes.$get());
      return (result as any).classes ?? result;
    },
  });

  const { data: studentsData, isLoading, isError: studentsError } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const result = await parseResponse(await api.students.$get());
      return (result as any).students ?? result;
    },
  });

  const { data: attendanceData, isError: attendanceError } = useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: async () => {
      const response = await api.attendance.$get({ query: { classId, date } });
      const result = await parseResponse(response);
      return (result as any).attendance ?? result;
    },
    enabled: !!classId,
  });

  const allStudents: any[] = Array.isArray(studentsData) ? studentsData : [];
  const classes: any[] = Array.isArray(classesData) ? classesData : [];
  const attendance: any[] = Array.isArray(attendanceData) ? attendanceData : [];
  const filtered = classId
    ? allStudents.filter((student: any) => String(student.classId) === classId)
    : [];

  useEffect(() => {
    const next: Record<number, string> = {};
    attendance.forEach((record: any) => {
      next[record.studentId] = record.status;
    });
    setMarks(next);
  }, [attendance, date, classId]);

  const markAll = (status: string) => {
    const next: Record<number, string> = {};
    filtered.forEach((student: any) => { next[student.id] = status; });
    setMarks(next);
  };

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!classId) throw new Error("Select a class before saving attendance");
      if (filtered.length === 0) throw new Error("There are no students in the selected class");

      const numericClassId = Number(classId);
      const records = filtered.map((student: any) => ({
        studentId: Number(student.id),
        classId: numericClassId,
        date,
        status: marks[student.id] || "present",
      }));
      return parseResponse(await api.attendance.$post({ json: records }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      success("Attendance saved");
    },
    onError: (error) => toastError("Save failed", error instanceof Error ? error.message : "Could not save attendance"),
  });

  const statusOptions = ["present", "absent", "late", "leave"];
  const hasLoadError = classesError || studentsError || attendanceError;

  return (
    <Layout title="Attendance">
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: "9px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "Poppins", outline: "none" }} />
        </div>
        <div style={{ minWidth: 200 }}>
          <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)}
            options={[{ value: "", label: "Select class..." }, ...classes.map((cls: any) => ({ value: String(cls.id), label: cls.name }))]} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => markAll("present")} disabled={!classId || filtered.length === 0}>All Present</Button>
          <Button variant="danger" size="sm" onClick={() => markAll("absent")} disabled={!classId || filtered.length === 0}>All Absent</Button>
        </div>
        <Button
          onClick={() => saveAttendance.mutate()}
          loading={saveAttendance.isPending}
          disabled={!classId || filtered.length === 0}
          style={{ marginLeft: "auto" }}
        >
          <Save size={14} /> {saved ? "Saved!" : "Save Attendance"}
        </Button>
      </div>

      {hasLoadError && (
        <div style={{ marginBottom: 14, padding: "10px 14px", border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 8, color: "#B91C1C", fontSize: 12 }}>
          Some attendance data could not be loaded. Refresh the page or try again.
        </div>
      )}

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
            ) : !classId ? (
              <tr><td colSpan={3} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                <CalendarCheck size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
                Select a class to mark attendance
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                No students in the selected class
              </td></tr>
            ) : filtered.map((student: any) => (
              <tr key={student.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{student.admissionNo}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{student.name}</td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {statusOptions.map(status => (
                      <button key={status} onClick={() => setMarks({ ...marks, [student.id]: status })}
                        style={{
                          padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: "1px solid", cursor: "pointer", textTransform: "capitalize", fontFamily: "Poppins",
                          ...(marks[student.id] === status
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

      {classId && attendance.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>ATTENDANCE — {date}</h3>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Student", "Date", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendance.map((record: any) => {
                  const studentName = filtered.find((student: any) => Number(student.id) === Number(record.studentId))?.name ?? `#${record.studentId}`;
                  return (
                    <tr key={record.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{studentName}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{record.date}</td>
                      <td style={{ padding: "10px 16px" }}><Badge status={record.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
