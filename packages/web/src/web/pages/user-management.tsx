import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { useRole } from "../lib/use-role";
import { useLocation } from "wouter";
import {
  ShieldCheck, Plus, Trash2, RefreshCw, User, Eye, EyeOff, BookOpen
} from "lucide-react";
import { Layout } from "../components/layout";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "admin" | "principal" | "teacher" | "accountant";
  createdAt?: string;
  assignedClass?: { id: number; name: string } | null;
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function UserManagementPage() {
  const { isAdmin, isLoading: roleLoading, user } = useRole();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "teacher" as "admin" | "principal" | "teacher" | "accountant", classId: "" });
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/");
  }, [isAdmin, roleLoading, navigate]);

  const { data, isLoading, isError, error: usersError } = useQuery<{ users: UserRecord[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => parseResponse(await fetch("/api/me/users", { credentials: "include" })),
    enabled: isAdmin,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => parseResponse(await fetch("/api/classes", { credentials: "include" })),
    enabled: isAdmin,
  });
  const allClasses: any[] = (classesData as any)?.classes ?? classesData ?? [];

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => parseResponse(await fetch("/api/me/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);
      setForm({ name: "", email: "", password: "", role: "teacher", classId: "" });
      setFormError("");
      success("User created successfully");
    },
    onError: (e: any) => { setFormError(e.message); toastError("Create failed", e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => parseResponse(await fetch(`/api/me/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      success("User deleted");
    },
    onError: (e: any) => toastError("Delete failed", e?.message || "Could not delete user"),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => parseResponse(await fetch(`/api/me/users/${id}/role`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })),
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      success(result?.classAssignmentsCleared ? "Role updated; teacher class assignment cleared" : "Role updated");
    },
    onError: (e: any) => toastError("Role change failed", e?.message),
  });

  const assignClassMutation = useMutation({
    mutationFn: async ({ classId, userId, currentClassId }: { classId: string; userId: string; currentClassId?: number | null }) => {
      const targetClassId = classId || (currentClassId ? String(currentClassId) : "");
      if (!targetClassId) throw new Error("Select a class to assign");
      return parseResponse(await fetch(`/api/classes/${targetClassId}/assign-teacher`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherUserId: classId ? userId : null }),
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      setAssigningUserId(null);
      setAssignClassId("");
      success("Class assignment updated");
    },
    onError: (e: any) => toastError("Assign failed", e?.message || "Could not update class assignment"),
  });

  const users = data?.users ?? [];
  const adminCount = users.filter(u => u.role === "admin").length;
  const principalCount = users.filter(u => u.role === "principal").length;
  const teacherCount = users.filter(u => u.role === "teacher").length;

  if (roleLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <Layout title="User Management" action={
      <button
        onClick={() => { setShowForm(true); setFormError(""); }}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", background: "#E91E8C", color: "#fff",
          border: "none", borderRadius: 10, cursor: "pointer",
          fontSize: 13, fontWeight: 600,
        }}>
        <Plus size={15} /> Add User
      </button>
    }>
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24, maxWidth: 720 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Admins</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#E91E8C" }}>{adminCount}<span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 400 }}>/2</span></div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Principals</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1B4D4D" }}>{principalCount}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Teachers</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#3B82F6" }}>{teacherCount}</div>
        </div>
      </div>

      {showForm && (
        <div style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
          padding: 24, marginBottom: 24, maxWidth: 520,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1B4D4D" }}>Create New User</h3>

          {formError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#DC2626", fontSize: 13 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Full Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Jane Mwangi"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@vineyardprimary.ac.ke"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  minLength={8}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  style={{ width: "100%", padding: "10px 40px 10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "principal" | "teacher" | "accountant", classId: "" }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }}>
                <option value="teacher">Teacher</option>
                <option value="principal">Principal</option>
                <option value="accountant">Accountant</option>
                <option value="admin" disabled={adminCount >= 2}>Admin {adminCount >= 2 ? "(max reached)" : ""}</option>
              </select>
              {form.role === "admin" && (
                <p style={{ fontSize: 11, color: "#F59E0B", margin: "4px 0 0" }}>
                  ⚠ Admin has full access to all financial data, staff, and system settings.
                </p>
              )}
            </div>

            {form.role === "teacher" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Assign Class <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                </label>
                <select
                  value={form.classId}
                  onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #D1FAE5", borderRadius: 8, fontSize: 13, outline: "none", background: "#F0FDF4" }}>
                  <option value="">— No class yet —</option>
                  {allClasses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.teacherName ? ` (${c.teacherName})` : ""}
                    </option>
                  ))}
                </select>
                {form.classId && (
                  <p style={{ fontSize: 11, color: "#16A34A", margin: "4px 0 0" }}>
                    ✓ Teacher will be assigned to this class immediately
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name.trim() || !form.email.trim() || form.password.length < 8}
              style={{
                padding: "10px 20px", background: "#E91E8C", color: "#fff",
                border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                opacity: (createMutation.isPending || !form.name.trim() || !form.email.trim() || form.password.length < 8) ? 0.6 : 1,
              }}>
              {createMutation.isPending ? "Creating..." : "Create User"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); }}
              style={{ padding: "10px 16px", background: "#F1F5F9", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1B4D4D" }}>All Users</span>
          <button onClick={() => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["classes"] }); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Loading...</div>
        ) : isError ? (
          <div style={{ padding: 40, textAlign: "center", color: "#DC2626", fontSize: 13 }}>
            {usersError instanceof Error ? usersError.message : "Could not load users"}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No users found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Email</th>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Role</th>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Assigned Class</th>
                <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const assignedClass = allClasses.find((c: any) => c.teacherUserId === u.id);
                const isAssigning = assigningUserId === u.id;
                const isCurrentUser = u.id === user?.id;

                return (
                  <tr key={u.id} style={{ borderTop: i > 0 ? "1px solid #F1F5F9" : "none" }}>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: u.role === "admin" ? "rgba(233,30,140,0.1)" : "rgba(27,77,77,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {u.role === "admin" ? <ShieldCheck size={15} color="#E91E8C" /> : <User size={15} color="#1B4D4D" />}
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{u.name}</span>
                          {isCurrentUser && <span style={{ marginLeft: 6, fontSize: 10, color: "#64748B" }}>(you)</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px", fontSize: 13, color: "#64748B" }}>{u.email}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <select
                        value={u.role}
                        disabled={isCurrentUser || changeRoleMutation.isPending}
                        onChange={e => {
                          const nextRole = e.target.value;
                          if (u.role === "teacher" && nextRole !== "teacher" && assignedClass) {
                            const ok = confirm(`Changing ${u.name} from Teacher will unassign them from ${assignedClass.name}. Continue?`);
                            if (!ok) return;
                          }
                          changeRoleMutation.mutate({ id: u.id, role: nextRole });
                        }}
                        title={isCurrentUser ? "You cannot change your own admin role here" : undefined}
                        style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          border: "1px solid",
                          borderColor: u.role === "admin" ? "#FBCFE8" : "#BBF7D0",
                          background: u.role === "admin" ? "#FDF2F8" : "#F0FDF4",
                          color: u.role === "admin" ? "#E91E8C" : "#166534",
                          cursor: isCurrentUser ? "not-allowed" : "pointer", outline: "none",
                          opacity: isCurrentUser ? 0.65 : 1,
                        }}>
                        <option value="teacher">Teacher</option>
                        <option value="principal">Principal</option>
                        <option value="accountant">Accountant</option>
                        <option value="admin" disabled={u.role !== "admin" && adminCount >= 2}>Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      {u.role === "teacher" ? (
                        isAssigning ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <select
                              value={assignClassId}
                              onChange={e => setAssignClassId(e.target.value)}
                              style={{ padding: "5px 8px", border: "1px solid #D1FAE5", borderRadius: 6, fontSize: 12, background: "#F0FDF4", outline: "none" }}>
                              <option value="">— None —</option>
                              {allClasses.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}{c.teacherUserId && c.teacherUserId !== u.id ? ` (${c.teacherName})` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => assignClassMutation.mutate({ classId: assignClassId, userId: u.id, currentClassId: assignedClass?.id ?? null })}
                              disabled={assignClassMutation.isPending || (!assignClassId && !assignedClass)}
                              style={{ padding: "5px 10px", background: "#16A34A", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                              Save
                            </button>
                            <button
                              onClick={() => { setAssigningUserId(null); setAssignClassId(""); }}
                              style={{ padding: "5px 8px", background: "#F1F5F9", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningUserId(u.id);
                              setAssignClassId(assignedClass ? String(assignedClass.id) : "");
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "5px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: "1px solid",
                              background: assignedClass ? "#F0FDF4" : "#F8FAFC",
                              borderColor: assignedClass ? "#BBF7D0" : "#E2E8F0",
                              color: assignedClass ? "#166534" : "#94A3B8",
                            }}>
                            <BookOpen size={11} />
                            {assignedClass ? assignedClass.name : "Assign class"}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: 12, color: "#CBD5E1" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <button
                        disabled={isCurrentUser || deleteMutation.isPending}
                        title={isCurrentUser ? "You cannot delete your own account" : undefined}
                        onClick={() => {
                          if (confirm(`Delete ${u.name}? This removes login access but preserves linked school history.`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        style={{
                          background: "none", border: "1px solid #FECACA", borderRadius: 6,
                          padding: "5px 8px", cursor: isCurrentUser ? "not-allowed" : "pointer", color: "#EF4444",
                          display: "flex", alignItems: "center", gap: 4, fontSize: 12,
                          opacity: isCurrentUser ? 0.45 : 1,
                        }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 20, padding: "16px 20px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#1B4D4D" }}>Role Permissions</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#E91E8C" }}>Admin (max 2)</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
              <li>Full access to all pages</li>
              <li>Fees, Payroll &amp; Accounts</li>
              <li>Staff management</li>
              <li>Financial Reports</li>
              <li>User management</li>
            </ul>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#1B4D4D" }}>Teacher (unlimited)</p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
              <li>Assigned-class students &amp; attendance</li>
              <li>Exams, timetable &amp; academic records</li>
              <li>Parent communication for assigned pupils</li>
              <li>Library loans; Transport/Inventory read-only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}
