import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "../components/layout";
import { api } from "../lib/api";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = [2024, 2025, 2026, 2027];

export default function TransportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"routes" | "students">("routes");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editRoute, setEditRoute] = useState<any>(null);
  const [routeForm, setRouteForm] = useState({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" });
  const [assignForm, setAssignForm] = useState({ studentId: "", routeId: "", term: "Term 1", year: new Date().getFullYear() });

  const { data: routes = [] } = useQuery({ queryKey: ["transport-routes"], queryFn: () => api("/transport/routes") });
  const { data: assignments = [] } = useQuery({ queryKey: ["transport-assignments"], queryFn: () => api("/transport/assignments") });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => api("/students") });

  const saveRoute = useMutation({
    mutationFn: () => editRoute
      ? api(`/transport/routes/${editRoute.id}`, { method: "PUT", body: { ...routeForm, fee: Number(routeForm.fee) } })
      : api("/transport/routes", { method: "POST", body: { ...routeForm, fee: Number(routeForm.fee) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transport-routes"] }); setShowRouteModal(false); setEditRoute(null); setRouteForm({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" }); },
  });

  const deleteRoute = useMutation({
    mutationFn: (id: number) => api(`/transport/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-routes"] }),
  });

  const saveAssign = useMutation({
    mutationFn: () => api("/transport/assignments", { method: "POST", body: { ...assignForm, studentId: Number(assignForm.studentId), routeId: Number(assignForm.routeId), year: Number(assignForm.year) } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transport-assignments"] }); setShowAssignModal(false); setAssignForm({ studentId: "", routeId: "", term: "Term 1", year: new Date().getFullYear() }); },
  });

  const deleteAssign = useMutation({
    mutationFn: (id: number) => api(`/transport/assignments/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transport-assignments"] }),
  });

  const openEdit = (r: any) => {
    setEditRoute(r);
    setRouteForm({ name: r.name, vehicle: r.vehicle || "", driver: r.driver || "", driverPhone: r.driverPhone || "", fee: r.fee?.toString() || "" });
    setShowRouteModal(true);
  };

  return (
    <Layout title="Transport">
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#161B22", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["routes", "students"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
              background: tab === t ? "#E91E8C" : "transparent", color: tab === t ? "#fff" : "#8B949E" }}>
            {t === "routes" ? "🚌 Routes" : "👦 Student Assignments"}
          </button>
        ))}
      </div>

      {tab === "routes" && (
        <>
          <button onClick={() => { setEditRoute(null); setRouteForm({ name: "", vehicle: "", driver: "", driverPhone: "", fee: "" }); setShowRouteModal(true); }}
            style={{ marginBottom: 16, padding: "9px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            + Add Route
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {routes.map((r: any) => (
              <div key={r.id} style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#F0F6FC" }}>{r.name}</div>
                  <div style={{ color: "#E91E8C", fontWeight: 700 }}>KES {r.fee?.toLocaleString()}/term</div>
                </div>
                <div style={{ fontSize: 13, color: "#8B949E", lineHeight: 2 }}>
                  <div>🚌 <strong style={{ color: "#F0F6FC" }}>Vehicle:</strong> {r.vehicle || "—"}</div>
                  <div>👤 <strong style={{ color: "#F0F6FC" }}>Driver:</strong> {r.driver || "—"}</div>
                  <div>📞 <strong style={{ color: "#F0F6FC" }}>Phone:</strong> {r.driverPhone || "—"}</div>
                  <div>👦 <strong style={{ color: "#F0F6FC" }}>Students:</strong> {assignments.filter((a: any) => a.routeId === r.id).length}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={() => openEdit(r)}
                    style={{ flex: 1, padding: "7px", background: "#21262D", border: "1px solid #30363D", borderRadius: 7, color: "#F0F6FC", cursor: "pointer", fontSize: 13 }}>Edit</button>
                  <button onClick={() => deleteRoute.mutate(r.id)}
                    style={{ padding: "7px 12px", background: "none", border: "1px solid #F85149", borderRadius: 7, color: "#F85149", cursor: "pointer", fontSize: 13 }}>Delete</button>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div style={{ color: "#8B949E", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>No routes added yet</div>}
          </div>
        </>
      )}

      {tab === "students" && (
        <>
          <button onClick={() => setShowAssignModal(true)}
            style={{ marginBottom: 16, padding: "9px 18px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            + Assign Student
          </button>
          <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#1B4D4D" }}>
                  {["Student", "Route", "Term", "Year", "Fee", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a: any) => {
                  const s = students.find((x: any) => x.id === a.studentId);
                  const r = routes.find((x: any) => x.id === a.routeId);
                  return (
                    <tr key={a.id} style={{ borderTop: "1px solid #30363D" }}>
                      <td style={tdS}>{s ? `${s.firstName} ${s.lastName}` : a.studentId}</td>
                      <td style={tdS}>{r?.name || a.routeId}</td>
                      <td style={tdS}>{a.term}</td>
                      <td style={tdS}>{a.year}</td>
                      <td style={tdS}>KES {r?.fee?.toLocaleString() || "—"}</td>
                      <td style={tdS}>
                        <button onClick={() => deleteAssign.mutate(a.id)}
                          style={{ fontSize: 12, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
                {assignments.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#8B949E" }}>No assignments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 28, width: 400 }}>
            <h3 style={{ margin: "0 0 20px", color: "#F0F6FC" }}>{editRoute ? "Edit Route" : "Add Route"}</h3>
            {[["Route Name", "name", "e.g. Nairobi West"], ["Vehicle", "vehicle", "e.g. KCB 123A"], ["Driver Name", "driver", ""], ["Driver Phone", "driverPhone", "07xx"], ["Fee per Term (KES)", "fee", ""]].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#8B949E" }}>{label}</label>
                <input value={(routeForm as any)[key]} onChange={e => setRouteForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph} style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveRoute.mutate()} disabled={!routeForm.name}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
              <button onClick={() => { setShowRouteModal(false); setEditRoute(null); }}
                style={{ flex: 1, padding: "10px", background: "#21262D", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 28, width: 380 }}>
            <h3 style={{ margin: "0 0 20px", color: "#F0F6FC" }}>Assign Student to Route</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#8B949E" }}>Student</label>
              <select value={assignForm.studentId} onChange={e => setAssignForm(f => ({ ...f, studentId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
                <option value="">Select student</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#8B949E" }}>Route</label>
              <select value={assignForm.routeId} onChange={e => setAssignForm(f => ({ ...f, routeId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
                <option value="">Select route</option>
                {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#8B949E" }}>Term</label>
                <select value={assignForm.term} onChange={e => setAssignForm(f => ({ ...f, term: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#8B949E" }}>Year</label>
                <select value={assignForm.year} onChange={e => setAssignForm(f => ({ ...f, year: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => saveAssign.mutate()} disabled={!assignForm.studentId || !assignForm.routeId}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Assign</button>
              <button onClick={() => setShowAssignModal(false)}
                style={{ flex: 1, padding: "10px", background: "#21262D", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const tdS: React.CSSProperties = { padding: "12px 16px", fontSize: 14, color: "#F0F6FC" };
