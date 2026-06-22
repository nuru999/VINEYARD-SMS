import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Pencil, Trash2, X, User, Download, FileSpreadsheet, Eye } from "lucide-react";
import { exportExcel, exportCSV } from "../lib/export";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const emptyStudent = {
  name: "",
  admissionNo: "",
  dob: "",
  gender: "",
  classId: "",
  parentName: "",
  parentPhone: "",
  address: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  status: "active",
};

export default function StudentsPage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { isAdmin } = useRole();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyStudent);

  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const r = await (await api.students.$get()).json();
      return (r as any).students ?? r;
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const r = await (await api.classes.$get()).json();
      return (r as any).classes ?? r;
    },
  });

  const save = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, classId: f.classId ? parseInt(f.classId) : null };
      if (editing)
        return (
          await api.students[":id"].$put({
            param: { id: String(editing.id) },
            json: payload,
          })
        ).json();
      return (await api.students.$post({ json: payload })).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setModal(false);
      setEditing(null);
      setForm(emptyStudent);
      success(editing ? "Student updated" : "Student added", editing ? "Record saved successfully." : "New student registered.");
    },
    onError: () => toastError("Save failed", "Could not save student. Try again."),
  });

  const remove = useMutation({
    mutationFn: async (id: number) =>
      (
        await api.students[":id"].$delete({ param: { id: String(id) } })
      ).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      success("Student removed", "Record deleted.");
    },
    onError: () => toastError("Delete failed", "Could not remove student."),
  });

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ ...s, classId: String(s.classId || "") });
    setModal(true);
  };
  const openNew = () => {
    setEditing(null);
    setForm(emptyStudent);
    setModal(true);
  };
  const openDetail = (s: any) => {
    setViewStudent(s);
    setDetailModal(true);
  };

  const allStudents: any[] = Array.isArray(data)
    ? data
    : (data as any)?.students ?? [];

  // Search: match name, admission no, parent name, phone, class name
  const filtered = allStudents.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.admissionNo?.toLowerCase().includes(q) ||
      s.parentName?.toLowerCase().includes(q) ||
      s.parentPhone?.toLowerCase().includes(q) ||
      s.className?.toLowerCase().includes(q) ||
      s.gender?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  const classes = Array.isArray(classesData)
    ? classesData
    : (classesData as any)?.classes ?? [];

  const getClass = (classId: number) =>
    classes.find((c: any) => c.id === classId)?.name ?? "—";

  const exportStudentsExcel = () => {
    const rows = filtered.map((s: any) => ({
      "Admission No": s.admissionNo,
      "Full Name": s.name,
      "Class": s.className ?? getClass(s.classId),
      "Gender": s.gender || "",
      "Date of Birth": s.dob || "",
      "Admission Date": s.admissionDate || "",
      "Status": s.status,
      "Parent / Guardian": s.parentName || "",
      "Parent Phone": s.parentPhone || "",
      "Parent Email": s.parentEmail || "",
      "Address": s.address || "",
    }));
    exportExcel(rows, "VineyardSMS_Students", "Students");
  };

  const exportStudentsCSV = () => {
    const rows = filtered.map((s: any) => ({
      "Admission No": s.admissionNo,
      "Full Name": s.name,
      "Class": s.className ?? getClass(s.classId),
      "Gender": s.gender || "",
      "Date of Birth": s.dob || "",
      "Admission Date": s.admissionDate || "",
      "Status": s.status,
      "Parent / Guardian": s.parentName || "",
      "Parent Phone": s.parentPhone || "",
      "Parent Email": s.parentEmail || "",
      "Address": s.address || "",
    }));
    exportCSV(rows, "VineyardSMS_Students");
  };

  return (
    <Layout
      title={isAdmin ? "All Students" : "My Class — Students"}
      action={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportStudentsCSV}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={exportStudentsExcel}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <FileSpreadsheet size={13} /> Excel
          </button>
          {isAdmin && (
            <Button onClick={openNew}>
              <Plus size={15} /> Add Student
            </Button>
          )}
        </div>
      }
    >
      {/* Search bar */}
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 400 }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-secondary)",
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isAdmin
              ? "Search by name, admission no, parent, class..."
              : "Search students..."
          }
          style={{
            width: "100%",
            padding: "9px 36px 9px 34px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: "Poppins",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 2,
              display: "flex",
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Count */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 10,
        }}
      >
        {filtered.length} student{filtered.length !== 1 ? "s" : ""}
        {search ? ` matching "${search}"` : ""}
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {[
                "Adm No",
                "Name",
                "Class",
                "Gender",
                "Parent",
                "Phone",
                "Status",
                ...(isAdmin ? ["Actions"] : []),
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={isAdmin ? 8 : 7} style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        height: 16,
                        background: "var(--border)",
                        borderRadius: 4,
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                >
                  {search
                    ? `No students found matching "${search}"`
                    : isAdmin
                    ? "No students yet"
                    : "No students in your class yet"}
                </td>
              </tr>
            ) : (
              filtered.map((s: any) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: "1px solid rgba(48,54,61,0.5)",
                    cursor: "pointer",
                  }}
                  onClick={() => openDetail(s)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--accent)",
                      fontWeight: 600,
                    }}
                  >
                    {s.admissionNo}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.name}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.className ?? getClass(s.classId) ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.gender || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.parentName || "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.parentPhone || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge status={s.status} />
                  </td>
                  {isAdmin && (
                    <td
                      style={{ padding: "12px 16px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/students/${s.id}`)}
                          title="View Profile"
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete student?")) remove.mutate(s.id);
                          }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Student Detail Modal (click any row) ── */}
      <Modal
        open={detailModal}
        onClose={() => setDetailModal(false)}
        title="Student Details"
        width={500}
      >
        {viewStudent && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 0 16px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(74,222,128,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <User size={24} color="var(--accent)" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {viewStudent.name}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}
                >
                  Adm No: {viewStudent.admissionNo}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <Badge status={viewStudent.status} />
              </div>
            </div>

            {/* Details grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px 24px",
              }}
            >
              {[
                { label: "Class", value: viewStudent.className ?? getClass(viewStudent.classId) },
                { label: "Gender", value: viewStudent.gender },
                { label: "Date of Birth", value: viewStudent.dob },
                { label: "Admission Date", value: viewStudent.admissionDate },
                { label: "Parent / Guardian", value: viewStudent.parentName },
                { label: "Parent Phone", value: viewStudent.parentPhone },
                { label: "Parent Email", value: viewStudent.parentEmail },
                { label: "Address", value: viewStudent.address },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: value ? "var(--text-primary)" : "var(--text-secondary)",
                      fontStyle: value ? "normal" : "italic",
                    }}
                  >
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDetailModal(false);
                    openEdit(viewStudent);
                  }}
                >
                  <Pencil size={13} /> Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete student?")) {
                      remove.mutate(viewStudent.id);
                      setDetailModal(false);
                    }
                  }}
                >
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Add / Edit Modal (admin only) ── */}
      {isAdmin && (
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={editing ? "Edit Student" : "Add Student"}
          width={560}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Admission No"
                value={form.admissionNo}
                onChange={(e) =>
                  setForm({ ...form, admissionNo: e.target.value })
                }
                required
              />
              <Input
                label="Date of Birth"
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />
              <Select
                label="Class"
                value={form.classId}
                onChange={(e) =>
                  setForm({ ...form, classId: e.target.value })
                }
                options={classes.map((c: any) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "graduated", label: "Graduated" },
                  { value: "transferred", label: "Transferred" },
                ]}
              />
              <Input
                label="Parent Name"
                value={form.parentName}
                onChange={(e) =>
                  setForm({ ...form, parentName: e.target.value })
                }
              />
              <Input
                label="Parent Phone"
                value={form.parentPhone}
                onChange={(e) =>
                  setForm({ ...form, parentPhone: e.target.value })
                }
              />
              <Input
                label="Admission Date"
                type="date"
                value={form.admissionDate}
                onChange={(e) =>
                  setForm({ ...form, admissionDate: e.target.value })
                }
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                {editing ? "Save Changes" : "Add Student"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
