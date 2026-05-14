import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { api } from "../lib/api";

const emptyStudent = { name: "", admissionNo: "", dob: "", gender: "", classId: "", parentName: "", parentPhone: "", address: "", admissionDate: new Date().toISOString().slice(0, 10), status: "active" };

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyStudent);

  const { data, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; },
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => { const r = await (await api.classes.$get()).json(); return (r as any).classes ?? r; },
  });

  const save = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, classId: f.classId ? parseInt(f.classId) : null };
      if (editing) return (await api.students[":id"].$put({ param: { id: String(editing.id) }, json: payload })).json();
      return (await api.students.$post({ json: payload })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); setModal(false); setEditing(null); setForm(emptyStudent); },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await api.students[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });

  const openEdit = (s: any) => { setEditing(s); setForm({ ...s, classId: String(s.classId || "") }); setModal(true); };
  const openNew = () => { setEditing(null); setForm(emptyStudent); setModal(true); };

  const students = data?.students?.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNo?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout title="Students" action={<Button onClick={openNew}><Plus size={15} /> Add Student</Button>}>
      {/* Search */}
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "Poppins", outline: "none" }} />
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Adm No", "Name", "Gender", "Parent", "Phone", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding: "12px 16px" }}>
                  <div style={{ height: 16, background: "var(--border)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                </td></tr>
              ))
            ) : students.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No students found</td></tr>
            ) : students.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{s.admissionNo}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.gender || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.parentName || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.parentPhone || "—"}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={s.status} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={13} /></Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete student?")) remove.mutate(s.id); }}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Student" : "Add Student"} width={560}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="Admission No" value={form.admissionNo} onChange={e => setForm({ ...form, admissionNo: e.target.value })} required />
            <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            <Select label="Gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
              options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
            <Select label="Class" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}
              options={(classesData?.classes || []).map((c: any) => ({ value: String(c.id), label: c.name }))} />
            <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "graduated", label: "Graduated" }, { value: "transferred", label: "Transferred" }]} />
            <Input label="Parent Name" value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} />
            <Input label="Parent Phone" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} />
            <Input label="Admission Date" type="date" value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />
            <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save Changes" : "Add Student"}</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
