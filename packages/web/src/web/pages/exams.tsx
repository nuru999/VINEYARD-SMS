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

const emptyExam = { name: "", classId: "", term: "", year: new Date().getFullYear(), startDate: "", endDate: "" };
const emptyResult = { examId: "", studentId: "", subjectId: "", marks: "", maxMarks: "100", grade: "", remarks: "" };

export default function ExamsPage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [examModal, setExamModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [ef, setEf] = useState<any>(emptyExam);
  const [rf, setRf] = useState<any>(emptyResult);
  const [activeTab, setActiveTab] = useState<"exams" | "results">("exams");

  const { data: examsData, isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => { try { const r = await (await api.exams.$get()).json(); return Array.isArray(r) ? r : (r as any).exams ?? []; } catch { return []; } },
  });

  const { data: resultsData } = useQuery({
    queryKey: ["results"],
    queryFn: async () => { try { const r = await (await api.results.$get()).json(); return Array.isArray(r) ? r : (r as any).results ?? []; } catch { return []; } },
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => { try { const r = await (await api.classes.$get()).json(); return Array.isArray(r) ? r : (r as any).classes ?? []; } catch { return []; } },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { try { const r = await (await api.students.$get()).json(); return Array.isArray(r) ? r : (r as any).students ?? []; } catch { return []; } },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => { try { const r = await (await api.subjects.$get()).json(); return Array.isArray(r) ? r : (r as any).subjects ?? []; } catch { return []; } },
  });

  const exams: any[] = Array.isArray(examsData) ? examsData : (examsData as any)?.exams ?? [];
  const results: any[] = Array.isArray(resultsData) ? resultsData : (resultsData as any)?.results ?? [];

  const saveExam = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, classId: parseInt(f.classId), year: parseInt(f.year) };
      if (editingExam) return (await api.exams[":id"].$put({ param: { id: String(editingExam.id) }, json: payload })).json();
      return (await api.exams.$post({ json: payload })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); setExamModal(false); setEditingExam(null); setEf(emptyExam); success("Exam saved"); },
    onError: (e: any) => toastError("Save failed", e?.message),
  });

  const deleteExam = useMutation({
    mutationFn: async (id: number) => (await api.exams[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); success("Exam deleted"); },
    onError: () => toastError("Delete failed"),
  });

  const saveResult = useMutation({
    mutationFn: async (f: any) => (await api.results.$post({ json: { ...f, examId: parseInt(f.examId), studentId: parseInt(f.studentId), subjectId: parseInt(f.subjectId), marks: parseFloat(f.marks), maxMarks: parseFloat(f.maxMarks) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["results"] }); setResultModal(false); setRf(emptyResult); success("Result saved"); },
    onError: (e: any) => toastError("Save failed", e?.message),
  });

  const tabs = ["exams", "results"] as const;

  return (
    <Layout title="Exams & Results" action={
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={() => setResultModal(true)}><Plus size={14} /> Enter Result</Button>
        <Button onClick={() => { setEditingExam(null); setEf(emptyExam); setExamModal(true); }}><Plus size={15} /> New Exam</Button>
      </div>
    }>
      {/* Tabs */}
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
           exams?.length === 0 ? (
             <Card style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)", fontSize: 13, gridColumn: "1/-1" }}>
               <ClipboardList size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />No exams yet
             </Card>
           ) : exams?.map((exam: any) => (
            <Card key={exam.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{exam.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{exam.term} • {exam.year}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingExam(exam); setEf({ ...exam, classId: String(exam.classId) }); setExamModal(true); }}><Pencil size={13} /></Button>
                  <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete exam?")) deleteExam.mutate(exam.id); }}><Trash2 size={13} /></Button>
                </div>
              </div>
              {exam.startDate && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{exam.startDate} → {exam.endDate}</div>}
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
              {results?.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No results entered yet</td></tr>
              ) : results?.map((r: any) => {
                const examName = exams.find((e: any) => e.id === r.examId)?.name ?? `#${r.examId}`;
                const students: any[] = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.students ?? [];
                const subjects: any[] = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.subjects ?? [];
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

      {/* Exam Modal */}
      <Modal open={examModal} onClose={() => setExamModal(false)} title={editingExam ? "Edit Exam" : "New Exam"}>
        <form onSubmit={e => { e.preventDefault(); saveExam.mutate(ef); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Exam Name" value={ef.name} onChange={e => setEf({ ...ef, name: e.target.value })} placeholder="e.g. Term 1 Exams" required />
          <Select label="Class" value={ef.classId} onChange={e => setEf({ ...ef, classId: e.target.value })}
            options={(Array.isArray(classesData) ? classesData : (classesData as any)?.classes ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Term" value={ef.term} onChange={e => setEf({ ...ef, term: e.target.value })} placeholder="Term 1" />
            <Input label="Year" type="number" value={ef.year} onChange={e => setEf({ ...ef, year: e.target.value })} />
            <Input label="Start Date" type="date" value={ef.startDate} onChange={e => setEf({ ...ef, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={ef.endDate} onChange={e => setEf({ ...ef, endDate: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setExamModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveExam.isPending}>{editingExam ? "Save" : "Create Exam"}</Button>
          </div>
        </form>
      </Modal>

      {/* Result Modal */}
      <Modal open={resultModal} onClose={() => setResultModal(false)} title="Enter Result">
        <form onSubmit={e => { e.preventDefault(); saveResult.mutate(rf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Exam" value={rf.examId} onChange={e => setRf({ ...rf, examId: e.target.value })}
            options={(exams || []).map((ex: any) => ({ value: String(ex.id), label: ex.name }))} />
          <Select label="Student" value={rf.studentId} onChange={e => setRf({ ...rf, studentId: e.target.value })}
            options={(Array.isArray(studentsData) ? studentsData : (studentsData as any)?.students || []).map((s: any) => ({ value: String(s.id), label: `${s.name} (${s.admissionNo})` }))} />
          <Select label="Subject" value={rf.subjectId} onChange={e => setRf({ ...rf, subjectId: e.target.value })}
            options={(Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.subjects || []).map((s: any) => ({ value: String(s.id), label: s.name }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Marks" type="number" value={rf.marks} onChange={e => setRf({ ...rf, marks: e.target.value })} required />
            <Input label="Max Marks" type="number" value={rf.maxMarks} onChange={e => setRf({ ...rf, maxMarks: e.target.value })} />
            <Input label="Grade" value={rf.grade} onChange={e => setRf({ ...rf, grade: e.target.value })} placeholder="A, B, C..." />
            <Input label="Remarks" value={rf.remarks} onChange={e => setRf({ ...rf, remarks: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setResultModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveResult.isPending}>Save Result</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
