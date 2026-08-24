import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const empty = {
  name: "",
  email: "",
  phone: "",
  designation: "Teacher",
  department: "",
  qualification: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  salary: "",
  status: "active",
  loginPassword: "",
};

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function StaffPage() {
  const qc = useQueryClient();
  const { isAdmin, isPrincipal } = useRole();
  const canManageStaff = isAdmin || isPrincipal;
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [showPw, setShowPw] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const result = await parseResponse(await api.staff.$get());
      return (result as any).staff ?? result;
    },
  });

  const save = useMutation({
    mutationFn: async (f: any) => {
      if (!canManageStaff) throw new Error("You do not have permission to manage staff");

      const { loginPassword, ...staffPayload } = f;
      const payload = {
        ...staffPayload,
        name: String(f.name || "").trim(),
        email: String(f.email || "").trim(),
        salary: f.salary === "" ? 0 : Number(f.salary),
      };

      const response = editing
        ? await api.staff[":id"].$put({ param: { id: String(editing.id) }, json: payload })
        : await api.staff.$post({ json: payload });
      const staffResult: any = await parseResponse(response);

      if (!editing && isAdmin && f.email && loginPassword && f.designation === "Teacher") {
        const createdStaff = staffResult?.staff ?? staffResult;
        const loginResponse = await fetch("/api/me/users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: f.name,
            email: f.email,
            password: loginPassword,
            role: "teacher",
            staffId: createdStaff.id,
          }),
        });

        try {
          await parseResponse(loginResponse);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login account failed";
          throw new Error(`Staff record was created, but the login account could not be created: ${message}`);
        }
      }

      return staffResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      const wasEditing = Boolean(editing);
      setModal(false);
      setEditing(null);
      setForm(empty);
      setShowPw(false);
      setSaveError("");
      success(wasEditing ? "Staff updated" : "Staff added");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Request failed";
      setSaveError(message);
      toastError("Save failed", message);
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      if (!canManageStaff) throw new Error("You do not have permission to manage staff");
      return parseResponse(await api.staff[":id"].$delete({ param: { id: String(id) } }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      success("Staff removed");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "Request failed";
      toastError("Delete failed", message);
    },
  });

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      designation: s.designation || "Teacher",
      department: s.department || "",
      qualification: s.qualification || "",
      joiningDate: s.joiningDate || "",
      salary: String(s.salary ?? ""),
      status: s.status || "active",
      loginPassword: "",
    });
    setModal(true);
    setShowPw(false);
    setSaveError("");
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, joiningDate: new Date().toISOString().slice(0, 10) });
    setModal(true);
    setShowPw(false);
    setSaveError("");
  };

  const rawMembers = Array.isArray(data) ? data : [];
  const members = rawMembers.filter((s: any) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout
      title="Staff"
      action={canManageStaff ? <Button onClick={openNew}><Plus size={15} /> Add Staff</Button> : undefined}
    >
      {!canManageStaff && !isError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", fontSize: 13 }}>
          Staff records are read-only for your role. Administrators and principals manage staff records.
        </div>
      )}

      {isError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13 }}>
          {error instanceof Error ? error.message : "Could not load staff records"}
        </div>
      )}

      <div style={{ marginBottom: 16, position: "relative", maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff..."
          style={{ width: "100%", padding: "9px 12px 9px 34px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13, fontFamily: "Poppins", outline: "none" }}
        />
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Name", "Designation", "Department", "Phone", "Salary (KES)", "Status", ...(canManageStaff ? ["Actions"] : [])].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={canManageStaff ? 7 : 6} style={{ padding: "12px 16px" }}>
                  <div style={{ height: 16, background: "var(--border)", borderRadius: 4 }} />
                </td></tr>
              ))
            ) : members.length === 0 ? (
              <tr><td colSpan={canManageStaff ? 7 : 6} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No staff found</td></tr>
            ) : members.map((s: any) => (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.name}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.designation}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.department || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{s.phone || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{Number(s.salary || 0).toLocaleString("en-KE")}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={s.status} /></td>
                {canManageStaff && (
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={13} /></Button>
                      <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete staff member? Staff with school history should be marked inactive instead.")) remove.mutate(s.id); }}><Trash2 size={13} /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManageStaff && (
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Staff" : "Add Staff"} width={560}>
          <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Select label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value, loginPassword: e.target.value === "Teacher" ? form.loginPassword : "" })}
                options={["Principal", "Teacher", "Accountant", "Admin", "Other"].map(d => ({ value: d, label: d }))} />
              <Input label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              <Input label="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
              <Input label="Joining Date" type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
              <Input label="Basic Salary (KES)" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
              <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </div>

            {!editing && isAdmin && form.designation === "Teacher" && (
              <div style={{ background: "rgba(233,30,140,0.06)", border: "1px solid rgba(233,30,140,0.2)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E91E8C", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  🔑 Teacher Login Account (optional)
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
                  Admins can set a password to create and link a teacher login. Leave blank to add the staff record only.
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Set login password"
                    value={form.loginPassword}
                    onChange={e => setForm({ ...form, loginPassword: e.target.value })}
                    style={{ width: "100%", padding: "9px 40px 9px 12px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 13, fontFamily: "Poppins", outline: "none", boxSizing: "border-box" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {!editing && isPrincipal && form.designation === "Teacher" && (
              <div style={{ fontSize: 12, color: "#64748B", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px 12px", borderRadius: 8 }}>
                You can add the teacher staff record. An admin can create the teacher's login account afterward from User Management.
              </div>
            )}

            {saveError && <div style={{ fontSize: 12, color: "#F85149", background: "rgba(248,81,73,0.1)", padding: "8px 12px", borderRadius: 8 }}>{saveError}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" loading={save.isPending}>{editing ? "Save Changes" : "Add Staff"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
