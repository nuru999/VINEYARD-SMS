import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { useToast } from "../components/ui/toast";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function TransportPage() {
  const qc = useQueryClient();
  const { isAdmin, isPrincipal } = useRole();
  const canManageTransport = isAdmin || isPrincipal;
  const { error: toastError } = useToast();
  const [tab, setTab] = useState<"routes" | "students">("routes");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editRoute, setEditRoute] = useState<any>(null);
  const [routeForm, setRouteForm] = useState({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" });
  const [assignForm, setAssignForm] = useState({ studentId: "", routeId: "", term: "Term 1", year: CURRENT_YEAR });

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ["transport-routes"],
    queryFn: async () => parseResponse(await api.transport.routes.$get()),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ["transport-assignments"],
    queryFn: async () => parseResponse(await api.transport.assignments.$get()),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["transport-students"],
    enabled: canManageTransport,
    queryFn: async () => {
      const r = await parseResponse(await api.students.$get());
      return (r as any).students ?? r;
    },
  });

  const showMutationError = (title: string) => (err: unknown) =>
    toastError(title, err instanceof Error ? err.message : "Request failed");

  const saveRoute = useMutation({
    mutationFn: async () => {
      const body = { ...routeForm, fee: Number(routeForm.fee) };
      const response = editRoute
        ? await api.transport.routes[":id"].$put({ param: { id: String(editRoute.id) }, json: body })
        : await api.transport.routes.$post({ json: body });
      return parseResponse(response);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-routes"] });
      setShowRouteModal(false);
      setEditRoute(null);
      setRouteForm({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" });
    },
    onError: showMutationError("Could not save route"),
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.transport.routes[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-routes"] }),
    onError: showMutationError("Could not delete route"),
  });

  const saveAssign = useMutation({
    mutationFn: async () => parseResponse(await api.transport.assignments.$post({
      json: {
        ...assignForm,
        studentId: Number(assignForm.studentId),
        routeId: Number(assignForm.routeId),
        year: Number(assignForm.year),
      },
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-assignments"] });
      setShowAssignModal(false);
      setAssignForm({ studentId: "", routeId: "", term: "Term 1", year: CURRENT_YEAR });
    },
    onError: showMutationError("Could not assign student"),
  });

  const deleteAssign = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.transport.assignments[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-assignments"] }),
    onError: showMutationError("Could not remove assignment"),
  });

  const openEdit = (r: any) => {
    setEditRoute(r);
    setRouteForm({ name: r.name, vehicle: r.vehicle || "", driver: r.driver || "", driverPhone: r.driverPhone || "", fee: r.fee?.toString() || "" });
    setShowRouteModal(true);
  };

  if (isLoading) {
    return <Layout title="Transport"><div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#64748B", fontSize: 16 }}>Loading transport...</div></Layout>;
  }

  return (
    <Layout title="Transport">
      {!canManageTransport && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#64748B", fontSize: 13 }}>
          Transport is read-only for your role. Administrators and principals manage routes and student assignments.
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#FFFFFF", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["routes", "students"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
              background: tab === t ? "#E91E8C" : "transparent", color: tab === t ? "#fff" : "#64748B" }}>
            {t === "routes" ? "🚌 Routes" : "👦 Student Assignments"}
          </button>
        ))}
      </div>

      {tab === "routes" && (
        <>
          {canManageTransport && (
            <button onClick={() => { setEditRoute(null); setRouteForm({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" }); setShowRouteModal(true); }}
              style={{ marginBottom: 16, padding: "9px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              + Add Route
            </button>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {(routes as any[]).map((r: any) => (
              <div key={r.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1E293B" }}>{r.name}</div>
                  <div style={{ color: "#E91E8C", fontWeight: 700 }}>KES {Number(r.fee || 0).toLocaleString()}/term</div>
                </div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 2 }}>
                  <div>🚌 <strong style={{ color: "#1E293B" }}>Vehicle:</strong> {r.vehicle || "—"}</div>
                  <div>👤 <strong style={{ color: "#1E293B" }}>Driver:</strong> {r.driver || "—"}</div>
                  <div>📞 <strong style={{ color: "#1E293B" }}>Phone:</strong> {r.driverPhone || "—"}</div>
                  <div>👦 <strong style={{ color: "#1E293B" }}>Students:</strong> {(assignments as any[]).filter((a: any) => a.routeId === r.id).length}</div>
                </div>
                {canManageTransport && (
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={() => openEdit(r)}
                      style={{ flex: 1, padding: "7px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 7, color: "#1E293B", cursor: "pointer", fontSize: 13 }}>Edit</button>
                    <button onClick={() => { if (confirm("Delete this route?")) deleteRoute.mutate(r.id); }}
                      style={{ padding: "7px 12px", background: "none", border: "1px solid #F85149", borderRadius: 7, color: "#F85149", cursor: "pointer", fontSize: 13 }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
            {(routes as any[]).length === 0 && <div style={{ color: "#64748B", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>No routes added yet</div>}
          </div>
        </>
      )}

      {tab === "students" && (
        <>
          {canManageTransport && (
            <button onClick={() => setShowAssignModal(true)}
              style={{ marginBottom: 16, padding: "9px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              + Assign Student
            </button>
          )}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1B4D4D" }}>
                  {["Student", "Route", "Term", "Year", "Fee", ...(canManageTransport ? [""] : [])].map((h, i) => (
                    <th key={`${h}-${i}`} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(assignments as any[]).map((a: any) => {
                  const s = (students as any[]).find((x: any) => x.id === a.studentId);
                  const r = (routes as any[]).find((x: any) => x.id === a.routeId);
                  return (
                    <tr key={a.id} style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={tdS}>{s ? (s.name ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()) : `Student #${a.studentId}`}</td>
                      <td style={tdS}>{r?.name || `Route #${a.routeId}`}</td>
                      <td style={tdS}>{a.term}</td>
                      <td style={tdS}>{a.year}</td>
                      <td style={tdS}>KES {r ? Number(r.fee || 0).toLocaleString() : "—"}</td>
                      {canManageTransport && (
                        <td style={tdS}>
                          <button onClick={() => deleteAssign.mutate(a.id)}
                            style={{ fontSize: 12, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {(assignments as any[]).length === 0 && (
                  <tr><td colSpan={canManageTransport ? 6 : 5} style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No assignments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManageTransport && showRouteModal && (
        <div style={overlayS}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 400 }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>{editRoute ? "Edit Route" : "Add Route"}</h3>
            {[["Route Name", "name", "e.g. Nairobi West"], ["Vehicle", "vehicle", "e.g. KCB 123A"], ["Driver Name", "driver", ""], ["Driver Phone", "driverPhone", "07xx"], ["Fee per Term (KES)", "fee", ""]].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" }}>{label}</label>
                <input value={(routeForm as any)[key]} onChange={e => setRouteForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph} style={inputS} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveRoute.mutate()} disabled={!routeForm.name.trim() || saveRoute.isPending}
                style={primaryButtonS}>{saveRoute.isPending ? "Saving..." : "Save"}</button>
              <button onClick={() => { setShowRouteModal(false); setEditRoute(null); }} style={secondaryButtonS}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {canManageTransport && showAssignModal && (
        <div style={overlayS}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, width: 380 }}>
            <h3 style={{ margin: "0 0 20px", color: "#1E293B" }}>Assign Student to Route</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Student</label>
              <select value={assignForm.studentId} onChange={e => setAssignForm(f => ({ ...f, studentId: e.target.value }))} style={inputS}>
                <option value="">Select student</option>
                {(students as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name ?? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Route</label>
              <select value={assignForm.routeId} onChange={e => setAssignForm(f => ({ ...f, routeId: e.target.value }))} style={inputS}>
                <option value="">Select route</option>
                {(routes as any[]).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelS}>Term</label>
                <select value={assignForm.term} onChange={e => setAssignForm(f => ({ ...f, term: e.target.value }))} style={inputS}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelS}>Year</label>
                <select value={assignForm.year} onChange={e => setAssignForm(f => ({ ...f, year: Number(e.target.value) }))} style={inputS}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveAssign.mutate()} disabled={!assignForm.studentId || !assignForm.routeId || saveAssign.isPending}
                style={primaryButtonS}>{saveAssign.isPending ? "Assigning..." : "Assign"}</button>
              <button onClick={() => setShowAssignModal(false)} style={secondaryButtonS}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const tdS: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#1E293B" };
const overlayS: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
const inputS: React.CSSProperties = { width: "100%", padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, boxSizing: "border-box" };
const labelS: React.CSSProperties = { display: "block", marginBottom: 5, fontSize: 13, color: "#64748B" };
const primaryButtonS: React.CSSProperties = { flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 };
const secondaryButtonS: React.CSSProperties = { flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", cursor: "pointer" };
