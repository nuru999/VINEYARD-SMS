import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { api } from "../lib/api";

const empty = { name: "", email: "", phone: "", designation: "Teacher", department: "", qualification: "", joiningDate: new Date().toISOString().slice(0, 10), salary: "", status: "active" };

export default function StaffPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await api.staff.$get()).json(),
  });

  const save = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, salary: f.salary ? parseFloat(f.salary) : 0 };
      if (editing) return (await api.staff[":id"].$put({ param: { id: String(editing.id) }, json: payload })).json();
      return (await api.staff.$post({ json: payload })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); setModal(false); setEditing(null); setForm(empty); },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await api.staff[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });

  const openEdit = (s: any) => { setEditing(s); setForm({ ...s, salary: String(s.salary || "") }); setModal(true); };
  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };

  const members = data?.staff?.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.designation?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Layout title="Staff" action={<Button onClick={openNew}><Plus size={15} /> Add Staff</Button>}>
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "Poppins", outline: "none" }} />
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Name", "Designation", "Department", "Phone", "Salary (KES)", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding: "12px 16px" }}>
                  <div style={{ height: 16, background: "var(--border)", borderRadius: 4 }} />
                </td></tr>
              ))
            ) : members.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No staff found</td></tr>
            ) : members.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.designation}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.department || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.phone || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{s.salary?.toLocaleString() || "—"}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={s.status} /></td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={13} /></Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete staff member?")) remove.mutate(s.id); }}><Trash2 size={13} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Staff" : "Add Staff"} width={560}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Select label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
              options={["Principal", "Teacher", "Accountant", "Admin", "Other"].map(d => ({ value: d, label: d }))} />
            <Input label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
            <Input label="Joining Date" type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
            <Input label="Basic Salary (KES)" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
            <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{editing ? "Save Changes" : "Add Staff"}</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
