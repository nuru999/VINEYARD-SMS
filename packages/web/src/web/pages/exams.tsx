import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const emptyExam = { name: "", classId: "", term: "", year: new Date().getFullYear(), startDate: "", endDate: "" };
const emptyResult = { examId: "", studentId: "", subjectId: "", marks: "", maxMarks: "100", remarks: "" };

async function parseResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function ExamsPage() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canManageExams = role === "admin" || role === "principal";
  const { success, error: toastError } = useToast();
  const [examModal, setExamModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [ef, setEf] = useState<any>(emptyExam);
  const [rf, setRf] = useState<any>(emptyResult);
  const [activeTab, setActiveTab] = useState<"exams" | "results">("exams");

  const { data: examsData, isLoading, error: examsError } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const result = await parseResponse(await api.exams.$get());
      return Array.isArray(result) ? result : (result as any).exams ?? [];
    },
  });

  const { data: resultsData, error: resultsError } = useQuery({
    queryKey: ["results"],
    queryFn: async () => {
      const result = await parseResponse(await api.results.$get());
      return Array.isArray(result) ? result : (result as any).results ?? [];
    },
  });

  const { data: classesData, error: classesError } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const result = await parseResponse(await api.classes.$get());
      return Array.isArray(result) ? result : (result as any).classes ?? [];
    },
  });

  const { data: studentsData, error: studentsError } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const result = await parseResponse(await api.students.$get());
      return Array.isArray(result) ? result : (result as any).students ?? [];
    },
  });

  const { data: subjectsData, error: subjectsError } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const result = await parseResponse(await api.subjects.$get());
      return Array.isArray(result) ? result : (result as any).subjects ?? [];
    },
  });

  const exams: any[] = Array.isArray(examsData) ? examsData : [];
  const results: any[] = Array.isArray(resultsData) ? resultsData : [];
  const classes: any[] = Array.isArray(classesData) ? classesData : [];
  const students: any[] = Array.isArray(studentsData) ? studentsData : [];
  const subjects: any[] = Array.isArray(subjectsData) ? subjectsData : [];
  const queryError = examsError || resultsError || classesError || studentsError || subjectsError;

  const selectedResultExam = exams.find((exam: any) => String(exam.id) === String(rf.examId));
  const resultStudents = selectedResultExam
    ? students.filter((student: any) => student.classId === selectedResultExam.classId)
    : [];
  const resultSubjects = selectedResultExam
    ? subjects.filter((subject: any) => subject.classId === selectedResultExam.classId)
    : [];

  const saveExam = useMutation({
    mutationFn: async (f: any) => {
      if (!String(f.name || "").trim()) throw new Error("Exam name is required");
      if (!f.classId) throw new Error("Select a class");
      const payload = { ...f, classId: parseInt(f.classId), year: f.year === "" ? null : parseInt(f.year) };
      const response = editingExam
        ? await api.exams[":id"].$put({ param: { id: String(editingExam.id) }, json: payload })
        : await api.exams.$post({ json: payload });
      return parseResponse(response);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      setExamModal(false);
      setEditingExam(null);
      setEf(emptyExam);
      success("Exam saved");
    },
    onError: (e: any) => toastError("Save failed", e?.message),
  });

  const deleteExam = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.exams[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      success("Exam deleted");
    },
    onError: (e: any) => toastError("Delete failed", e?.message),
  });

  const saveResult = useMutation({
    mutationFn: async (f: any) => {
      if (!f.examId || !f.studentId || !f.subjectId) throw new Error("Select an exam, student, and subject");
      const marks = Number(f.marks);
      const maxMarks = Number(f.maxMarks || 100);
      if (!Number.isFinite(maxMarks) || maxMarks <= 0) throw new Error("Max marks must be greater than 0");
      if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
        throw new Error(`Marks must be between 0 and ${maxMarks}`);
      }

      const response = await api.results.$post({
        json: {
          examId: parseInt(f.examId),
          studentId: parseInt(f.studentId),
          subjectId: parseInt(f.subjectId),
          marks,
          maxMarks,
          remarks: f.remarks,
        },
      });
      return parseResponse(response);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
      qc.invalidateQueries({ queryKey: ["report-cards"] });
      setResultModal(false);
      setRf(emptyResult);
      success("Result saved");
    },
    onError: (e: any) => toastError("Save failed", e?.message),
  });

  const tabs = ["exams", "results"] as const;

  return (
    <Layout title="Exams & Results" action={
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={() => { setRf(emptyResult); setResultModal(true); }}><Plus size={14} /> Enter Result</Button>
        {canManageExams && (
          <Button onClick={() => { setEditingExam(null); setEf(emptyExam); setExamModal(true); }}><Plus size={15} /> New Exam</Button>
        )}
      </div>
    }>
      {queryError && (
        <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13 }}>
          {(queryError as Error).message || "Could not load academic records"}
        </div>
      )}

      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--bg-secondary)", padding: 4, borderRadius: 10, border: "1px solid var(--border)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "Poppins", fontSize: 13, fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s",
              background: activeTab === t ? "var(--accent)" : "transparent", color: activeTab === t ? "#F8FAFC" : "var(--text-secondary)" }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "exams" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {isLoading ? <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div> :
           exams.length === 0 ? (
             <Card style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)", fontSize: 13, gridColumn: "1/-1" }}>
               <ClipboardList size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />No exams yet
             </Card>
           ) : exams.map((exam: any) => (
            <Card key={exam.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{exam.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{exam.term || "No term"} • {exam.year || "—"}</div>
                </div>
                {canManageExams && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingExam(exam); setEf({ ...exam, classId: String(exam.classId) }); setExamModal(true); }}><Pencil size={13} /></Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete this exam? Exams with results are kept for academic history.")) deleteExam.mutate(exam.id); }}><Trash2 size={13} /></Button>
                  </div>
                )}
              </div>
              {exam.startDate && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{exam.startDate} → {exam.endDate || "—"}</div>}
            </Card>
          ))}
        </div>
      )}

      {activeTab === "results" && (
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Exam", "Student", "Subject", "Marks", "Max Marks", "Grade", "Remarks"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No results entered yet</td></tr>
              ) : results.map((r: any) => {
                const examName = exams.find((e: any) => e.id === r.examId)?.name ?? `#${r.examId}`;
                const studentName = students.find((s: any) => s.id === r.studentId)?.name ?? `#${r.studentId}`;
                const subjectName = subjects.find((s: any) => s.id === r.subjectId)?.name ?? `#${r.subjectId}`;
                return (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{examName}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{studentName}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{subjectName}</td>
                  <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{r.marks}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{r.maxMarks}</td>
                  <td style={{ padding: "10px 14px" }}>{r.grade ? <Badge status={r.grade}>{r.grade}</Badge> : "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{r.remarks || "—"}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={examModal} onClose={() => setExamModal(false)} title={editingExam ? "Edit Exam" : "New Exam"}>
        <form onSubmit={e => { e.preventDefault(); saveExam.mutate(ef); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Exam Name" value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} placeholder="e.g. Term 1 Exams" required />
          <Select label="Class" value={ef.classId} onChange={e => setEf({ ...ef, classId: e.target.value })}
            options={[{ value: "", label: "Select class..." }, ...classes.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Term" value={ef.term || ""} onChange={e => setEf({ ...ef, term: e.target.value })} placeholder="Term 1" />
            <Input label="Year" type="number" value={ef.year ?? ""} onChange={e => setEf({ ...ef, year: e.target.value })} />
            <Input label="Start Date" type="date" value={ef.startDate || ""} onChange={e => setEf({ ...ef, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={ef.endDate || ""} onChange={e => setEf({ ...ef, endDate: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setExamModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveExam.isPending} disabled={!String(ef.name || "").trim() || !ef.classId}>{editingExam ? "Save" : "Create Exam"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={resultModal} onClose={() => setResultModal(false)} title="Enter Result">
        <form onSubmit={e => { e.preventDefault(); saveResult.mutate(rf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Exam" value={rf.examId} onChange={e => setRf({ ...rf, examId: e.target.value, studentId: "", subjectId: "" })}
            options={[{ value: "", label: "Select exam..." }, ...exams.map((ex: any) => ({ value: String(ex.id), label: `${ex.name}${ex.term ? ` — ${ex.term}` : ""}` }))]} />
          <Select label="Student" value={rf.studentId} onChange={e => setRf({ ...rf, studentId: e.target.value })}
            options={[{ value: "", label: selectedResultExam ? "Select student..." : "Select an exam first" }, ...resultStudents.map((s: any) => ({ value: String(s.id), label: `${s.name} (${s.admissionNo})` }))]} />
          <Select label="Subject" value={rf.subjectId} onChange={e => setRf({ ...rf, subjectId: e.target.value })}
            options={[{ value: "", label: selectedResultExam ? "Select subject..." : "Select an exam first" }, ...resultSubjects.map((s: any) => ({ value: String(s.id), label: s.name }))]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Marks" type="number" value={rf.marks} onChange={e => setRf({ ...rf, marks: e.target.value })} required />
            <Input label="Max Marks" type="number" value={rf.maxMarks} onChange={e => setRf({ ...rf, maxMarks: e.target.value })} />
          </div>
          <Input label="Remarks" value={rf.remarks} onChange={e => setRf({ ...rf, remarks: e.target.value })} />
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-primary)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
            Grade is calculated automatically from Marks ÷ Max Marks, so the stored grade always matches the score.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setResultModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveResult.isPending} disabled={!rf.examId || !rf.studentId || !rf.subjectId || rf.marks === ""}>Save Result</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
