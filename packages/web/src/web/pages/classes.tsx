import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, BookOpen, Hash, UserCheck, X } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

export default function ClassesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useRole();

  const [classModal, setClassModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [classForm, setClassForm] = useState({ name: "", level: "primary" });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", classId: "" });
  const [assignTeacherId, setAssignTeacherId] = useState("");

  const { data: classesData, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const r = await (await api.classes.$get()).json();
      return (r as any).classes ?? r;
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.subjects.$get()).json(),
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const r = await fetch("/api/classes/teachers", { credentials: "include" });
      return r.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const allTeachers = teachersData?.teachers ?? [];

  const saveClass = useMutation({
    mutationFn: async (f: any) => {
      if (editingClass)
        return (
          await api.classes[":id"].$put({
            param: { id: String(editingClass.id) },
            json: f,
          })
        ).json();
      return (await api.classes.$post({ json: f })).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      setClassModal(false);
      setEditingClass(null);
      setClassForm({ name: "", level: "primary" });
    },
  });

  const deleteClass = useMutation({
    mutationFn: async (id: number) =>
      (
        await api.classes[":id"].$delete({ param: { id: String(id) } })
      ).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });

  const assignTeacher = useMutation({
    mutationFn: async ({
      classId,
      teacherUserId,
    }: {
      classId: number;
      teacherUserId: string | null;
    }) => {
      const r = await fetch(`/api/classes/${classId}/assign-teacher`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherUserId }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      setAssignModal(false);
      setAssignTarget(null);
      setAssignTeacherId("");
    },
  });

  const saveSubject = useMutation({
    mutationFn: async (f: any) =>
      (
        await api.subjects.$post({
          json: { ...f, classId: parseInt(f.classId) },
        })
      ).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      setSubjectModal(false);
      setSubjectForm({ name: "", code: "", classId: "" });
    },
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: number) =>
      (
        await api.subjects[":id"].$delete({ param: { id: String(id) } })
      ).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const openAssign = (cls: any) => {
    setAssignTarget(cls);
    setAssignTeacherId(cls.teacherUserId ?? "");
    setAssignModal(true);
  };

  const classes = Array.isArray(classesData)
    ? classesData
    : classesData?.classes ?? [];

  return (
    <Layout
      title="Classes & Subjects"
      action={
        isAdmin ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSubjectModal(true)}
            >
              <Plus size={14} /> Add Subject
            </Button>
            <Button
              onClick={() => {
                setEditingClass(null);
                setClassForm({ name: "", level: "primary" });
                setClassModal(true);
              }}
            >
              <Plus size={15} /> Add Class
            </Button>
          </div>
        ) : undefined
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Classes ── */}
        <div>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            CLASSES
          </h3>
          {isLoading ? (
            <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Loading...
            </div>
          ) : classes.length === 0 ? (
            <Card
              style={{
                textAlign: "center",
                padding: "32px 20px",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              <BookOpen
                size={32}
                style={{
                  margin: "0 auto 8px",
                  opacity: 0.3,
                  display: "block",
                }}
              />
              No classes yet
            </Card>
          ) : (
            classes.map((c: any) => (
              <Card
                key={c.id}
                style={{
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "rgba(74,222,128,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {c.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Badge status={c.level} />
                      {c.teacherName ? (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--accent)",
                            background: "rgba(74,222,128,0.1)",
                            padding: "2px 7px",
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <UserCheck size={10} />
                          {c.teacherName}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            fontStyle: "italic",
                          }}
                        >
                          No teacher assigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAssign(c)}
                      title="Assign Teacher"
                    >
                      <UserCheck size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingClass(c);
                        setClassForm({ name: c.name, level: c.level });
                        setClassModal(true);
                      }}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete class?")) deleteClass.mutate(c.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* ── Subjects ── */}
        <div>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            SUBJECTS
          </h3>
          {(subjectsData as any)?.subjects?.length === 0 ? (
            <Card
              style={{
                textAlign: "center",
                padding: "32px 20px",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            >
              <Hash
                size={32}
                style={{
                  margin: "0 auto 8px",
                  opacity: 0.3,
                  display: "block",
                }}
              />
              No subjects yet
            </Card>
          ) : (
            (subjectsData as any)?.subjects?.map((s: any) => (
              <Card
                key={s.id}
                style={{
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.name}
                  </div>
                  {s.code && (
                    <div
                      style={{ fontSize: 11, color: "var(--text-secondary)" }}
                    >
                      Code: {s.code}
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete subject?"))
                        deleteSubject.mutate(s.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ── Class Modal (admin only) ── */}
      {isAdmin && (
        <Modal
          open={classModal}
          onClose={() => setClassModal(false)}
          title={editingClass ? "Edit Class" : "Add Class"}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveClass.mutate(classForm);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <Input
              label="Class Name"
              value={classForm.name}
              onChange={(e) =>
                setClassForm({ ...classForm, name: e.target.value })
              }
              placeholder="e.g. Grade 1"
              required
            />
            <Select
              label="Level"
              value={classForm.level}
              onChange={(e) =>
                setClassForm({ ...classForm, level: e.target.value })
              }
              options={[
                { value: "primary", label: "Primary" },
                { value: "secondary", label: "Secondary" },
              ]}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setClassModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saveClass.isPending}>
                {editingClass ? "Save" : "Add Class"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Assign Teacher Modal (admin only) ── */}
      {isAdmin && (
        <Modal
          open={assignModal}
          onClose={() => setAssignModal(false)}
          title={`Assign Teacher — ${assignTarget?.name ?? ""}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select
              label="Class Teacher"
              value={assignTeacherId}
              onChange={(e) => setAssignTeacherId(e.target.value)}
              options={[
                { value: "", label: "— None —" },
                ...allTeachers.map((t: any) => ({
                  value: t.userId,
                  label: t.name,
                })),
              ]}
            />
            {allTeachers.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                No teacher accounts found. Create a teacher user in User Management first.
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                loading={assignTeacher.isPending}
                onClick={() =>
                  assignTeacher.mutate({
                    classId: assignTarget.id,
                    teacherUserId: assignTeacherId || null,
                  })
                }
              >
                Assign
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Subject Modal (admin only) ── */}
      {isAdmin && (
        <Modal
          open={subjectModal}
          onClose={() => setSubjectModal(false)}
          title="Add Subject"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSubject.mutate(subjectForm);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <Input
              label="Subject Name"
              value={subjectForm.name}
              onChange={(e) =>
                setSubjectForm({ ...subjectForm, name: e.target.value })
              }
              placeholder="e.g. Mathematics"
              required
            />
            <Input
              label="Subject Code"
              value={subjectForm.code}
              onChange={(e) =>
                setSubjectForm({ ...subjectForm, code: e.target.value })
              }
              placeholder="e.g. MATH"
            />
            <Select
              label="Class"
              value={subjectForm.classId}
              onChange={(e) =>
                setSubjectForm({ ...subjectForm, classId: e.target.value })
              }
              options={classes.map((c: any) => ({
                value: String(c.id),
                label: c.name,
              }))}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSubjectModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saveSubject.isPending}>
                Add Subject
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
