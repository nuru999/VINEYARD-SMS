import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Hash, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function ClassesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const { success, error: toastError } = useToast();

  const [classModal, setClassModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [classForm, setClassForm] = useState({ name: "", level: "primary" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", classId: "" });
  const [assignTeacherId, setAssignTeacherId] = useState("");

  const { data: classesData, isLoading, isError, error } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const data = await parseResponse(await api.classes.$get());
      return (data as any).classes ?? data;
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const data = await parseResponse(await api.subjects.$get());
      return (data as any).subjects ?? data;
    },
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => parseResponse(await fetch("/api/classes/teachers", { credentials: "include" })),
    staleTime: 1000 * 60 * 5,
    enabled: isAdmin,
  });

  const classes: any[] = Array.isArray(classesData) ? classesData : [];
  const subjects: any[] = Array.isArray(subjectsData) ? subjectsData : [];
  const allTeachers: any[] = Array.isArray((teachersData as any)?.teachers) ? (teachersData as any).teachers : [];

  const showError = (title: string) => (err: unknown) =>
    toastError(title, err instanceof Error ? err.message : "Request failed");

  const saveClass = useMutation({
    mutationFn: async (form: typeof classForm) => {
      const response = editingClass
        ? await api.classes[":id"].$put({ param: { id: String(editingClass.id) }, json: form })
        : await api.classes.$post({ json: form });
      return parseResponse(response);
    },
    onSuccess: () => {
      const wasEditing = Boolean(editingClass);
      qc.invalidateQueries({ queryKey: ["classes"] });
      setClassModal(false);
      setEditingClass(null);
      setClassForm({ name: "", level: "primary" });
      success(wasEditing ? "Class updated" : "Class added");
    },
    onError: showError("Class save failed"),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.classes[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      success("Class deleted");
    },
    onError: showError("Class delete failed"),
  });

  const assignTeacher = useMutation({
    mutationFn: async ({ classId, teacherUserId }: { classId: number; teacherUserId: string | null }) =>
      parseResponse(await fetch(`/api/classes/${classId}/assign-teacher`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherUserId }),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      setAssignModal(false);
      setAssignTarget(null);
      setAssignTeacherId("");
      success("Teacher assignment updated");
    },
    onError: showError("Teacher assignment failed"),
  });

  const saveSubject = useMutation({
    mutationFn: async (form: typeof subjectForm) => {
      const classId = Number(form.classId);
      return parseResponse(await api.subjects.$post({
        json: { name: form.name, code: form.code, classId },
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setSubjectModal(false);
      setSubjectForm({ name: "", code: "", classId: "" });
      success("Subject added");
    },
    onError: showError("Subject save failed"),
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.subjects[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      success("Subject deleted");
    },
    onError: showError("Subject delete failed"),
  });

  const openAssign = (cls: any) => {
    setAssignTarget(cls);
    setAssignTeacherId(cls.teacherUserId ?? "");
    setAssignModal(true);
  };

  return (
    <Layout
      title="Classes & Subjects"
      action={isAdmin ? (
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setSubjectModal(true)}>
            <Plus size={14} /> Add Subject
          </Button>
          <Button onClick={() => {
            setEditingClass(null);
            setClassForm({ name: "", level: "primary" });
            setClassModal(true);
          }}>
            <Plus size={15} /> Add Class
          </Button>
        </div>
      ) : undefined}
    >
      {isError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13 }}>
          {error instanceof Error ? error.message : "Could not load classes"}
        </div>
      )}

      {!isAdmin && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", fontSize: 13 }}>
          Classes and subjects are read-only for your role. Academic structure changes are admin-only.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <div>
          <h3 style={sectionTitle}>CLASSES</h3>
          {isLoading ? (
            <div style={emptyStyle}>Loading...</div>
          ) : classes.length === 0 ? (
            <Card style={emptyCardStyle}><BookOpen size={30} style={emptyIconStyle} />No classes yet</Card>
          ) : classes.map((cls: any) => (
            <Card key={cls.id} style={rowCardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={iconBoxStyle}><BookOpen size={16} color="var(--accent)" /></div>
                <div>
                  <div style={rowTitleStyle}>{cls.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    <Badge status={cls.level} />
                    <span style={{ fontSize: 11, color: cls.teacherName ? "var(--accent)" : "var(--text-secondary)" }}>
                      {cls.teacherName ? `Teacher: ${cls.teacherName}` : "No teacher assigned"}
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Button variant="ghost" size="sm" onClick={() => openAssign(cls)} title="Assign Teacher"><UserCheck size={13} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingClass(cls);
                    setClassForm({ name: cls.name, level: cls.level });
                    setClassModal(true);
                  }}><Pencil size={13} /></Button>
                  <Button variant="danger" size="sm" onClick={() => {
                    if (confirm("Delete this class? It cannot be deleted while students or school records still reference it.")) deleteClass.mutate(cls.id);
                  }}><Trash2 size={13} /></Button>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div>
          <h3 style={sectionTitle}>SUBJECTS</h3>
          {subjects.length === 0 ? (
            <Card style={emptyCardStyle}><Hash size={30} style={emptyIconStyle} />No subjects yet</Card>
          ) : subjects.map((subject: any) => {
            const cls = classes.find((item: any) => item.id === subject.classId);
            return (
              <Card key={subject.id} style={rowCardStyle}>
                <div>
                  <div style={rowTitleStyle}>{subject.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                    {subject.code ? `${subject.code} · ` : ""}{cls?.name || `Class #${subject.classId}`}
                  </div>
                </div>
                {isAdmin && (
                  <Button variant="danger" size="sm" onClick={() => {
                    if (confirm("Delete this subject? Subjects with exam results cannot be deleted.")) deleteSubject.mutate(subject.id);
                  }}><Trash2 size={13} /></Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <Modal open={classModal} onClose={() => setClassModal(false)} title={editingClass ? "Edit Class" : "Add Class"}>
          <form onSubmit={(e) => { e.preventDefault(); saveClass.mutate(classForm); }} style={formStyle}>
            <Input label="Class Name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Grade 1" required />
            <Select label="Level" value={classForm.level} onChange={(e) => setClassForm({ ...classForm, level: e.target.value })} options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
            ]} />
            <div style={modalActionsStyle}>
              <Button variant="secondary" type="button" onClick={() => setClassModal(false)}>Cancel</Button>
              <Button type="submit" loading={saveClass.isPending}>{editingClass ? "Save" : "Add Class"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isAdmin && (
        <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Assign Teacher — ${assignTarget?.name ?? ""}`}>
          <div style={formStyle}>
            <Select label="Class Teacher" value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)} options={[
              { value: "", label: "— None —" },
              ...allTeachers.map((teacher: any) => ({ value: teacher.userId, label: teacher.name })),
            ]} />
            {allTeachers.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>No active linked teacher accounts found.</p>
            )}
            <div style={modalActionsStyle}>
              <Button variant="secondary" type="button" onClick={() => setAssignModal(false)}>Cancel</Button>
              <Button loading={assignTeacher.isPending} onClick={() => assignTeacher.mutate({
                classId: assignTarget.id,
                teacherUserId: assignTeacherId || null,
              })}>Assign</Button>
            </div>
          </div>
        </Modal>
      )}

      {isAdmin && (
        <Modal open={subjectModal} onClose={() => setSubjectModal(false)} title="Add Subject">
          <form onSubmit={(e) => { e.preventDefault(); saveSubject.mutate(subjectForm); }} style={formStyle}>
            <Input label="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g. Mathematics" required />
            <Input label="Subject Code" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="e.g. MATH" />
            <Select label="Class" value={subjectForm.classId} onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })} options={classes.map((cls: any) => ({
              value: String(cls.id),
              label: cls.name,
            }))} />
            <div style={modalActionsStyle}>
              <Button variant="secondary" type="button" onClick={() => setSubjectModal(false)}>Cancel</Button>
              <Button type="submit" loading={saveSubject.isPending} disabled={!subjectForm.classId}>Add Subject</Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}

const sectionTitle: React.CSSProperties = { margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" };
const rowCardStyle: React.CSSProperties = { marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const rowTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };
const iconBoxStyle: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center" };
const emptyStyle: React.CSSProperties = { color: "var(--text-secondary)", fontSize: 13 };
const emptyCardStyle: React.CSSProperties = { textAlign: "center", padding: "32px 20px", color: "var(--text-secondary)", fontSize: 13 };
const emptyIconStyle: React.CSSProperties = { margin: "0 auto 8px", opacity: 0.3, display: "block" };
const formStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };
const modalActionsStyle: React.CSSProperties = { display: "flex", gap: 10, justifyContent: "flex-end" };
