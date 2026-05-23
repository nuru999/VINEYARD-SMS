import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { api } from "../lib/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMES: Record<number, string> = {
  1: "7:30–8:15", 2: "8:15–9:00", 3: "9:00–9:45", 4: "9:45–10:30",
  5: "10:45–11:30", 6: "11:30–12:15", 7: "13:00–13:45", 8: "13:45–14:30",
};

export default function TimetablePage() {
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ day: string; period: number } | null>(null);
  const [form, setForm] = useState({ subject: "", teacherId: "" });

  const { data: classes = [], isLoading } = useQuery({ queryKey: ["classes"], queryFn: async () => { const r = await (await api.classes.$get()).json(); return (r as any).classes ?? r; } });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: async () => { const r = await (await api.staff.$get()).json(); return (r as any).staff ?? r; } });
  const { data: slotsData = [] } = useQuery({
    queryKey: ["timetable", selectedClass],
    queryFn: async () => {
      const r = await api.timetable.$get({ query: selectedClass ? { classId: String(selectedClass) } : {} });
      const d = await r.json();
      return Array.isArray(d) ? d : (d?.slots ?? d?.timetable ?? []);
    },
    enabled: !!selectedClass,
  });
  const slots = Array.isArray(slotsData) ? slotsData : [];

  const saveSlot = useMutation({
    mutationFn: async () => {
      if (!editing || !selectedClass) return;
      const existing = (slots as any[]).find((s: any) => s.day === editing.day && s.period === editing.period);
      const payload = {
        classId: selectedClass, day: editing.day, period: editing.period,
        subject: form.subject, teacherId: form.teacherId ? Number(form.teacherId) : null,
      };
      if (existing) return (await api.timetable[":id"].$put({ param: { id: String(existing.id) }, json: payload })).json();
      return (await api.timetable.$post({ json: payload })).json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timetable"] }); setEditing(null); },
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: number) => (await api.timetable[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });

  const getSlot = (day: string, period: number) =>
    slots.find((s: any) => s.day === day && s.period === period);

  const openEdit = (day: string, period: number) => {
    const existing = getSlot(day, period);
    setForm({ subject: existing?.subject || "", teacherId: existing?.teacherId?.toString() || "" });
    setEditing({ day, period });
  };

  const printTimetable = () => {
    if (!selectedClass) return;
    const cls = classes.find((c: any) => c.id === selectedClass);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Timetable - ${cls?.name}</title>
    <style>body{font-family:Arial;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:8px;text-align:center;font-size:12px}th{background:#1B4D4D;color:white}
    .period-time{font-size:10px;color:#666}</style></head><body>
    <h2>Vineyard Primary School</h2><h3 style="text-align:center">Timetable — ${cls?.name}</h3>
    <table><tr><th>Period</th>${DAYS.map(d => `<th>${d}</th>`).join("")}</tr>
    ${PERIODS.map(p => `<tr><td><b>Period ${p}</b><br><span class="period-time">${PERIOD_TIMES[p]}</span></td>
    ${DAYS.map(d => { const s = getSlot(d, p); return `<td>${s ? `<b>${s.subject}</b>` : ""}</td>`; }).join("")}</tr>`).join("")}
    </table></body></html>`);
    win.document.close(); win.print();
  };

  if (isLoading) return <Layout title="Timetable"><div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#64748B", fontSize: 16 }}>Loading timetable...</div></Layout>;

  return (
    <Layout title="Timetable">
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value) || null)}
          style={{ padding: "8px 14px", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, fontFamily: "'Poppins', sans-serif" }}>
          <option value="">Select Class</option>
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selectedClass && (
          <button onClick={printTimetable}
            style={{ padding: "8px 16px", background: "#1B4D4D", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}>
            🖨️ Print Timetable
          </button>
        )}
      </div>

      {!selectedClass ? (
        <div style={{ textAlign: "center", padding: 80, color: "#94A3B8", fontSize: 15 }}>
          Select a class to view or edit its timetable
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 90 }}>Period</th>
                {DAYS.map(d => <th key={d} style={thStyle}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p}>
                  <td style={{ ...tdStyle, textAlign: "center", background: "#F8FAFC" }}>
                    <div style={{ fontWeight: 700, color: "#1E293B", fontSize: 13 }}>P{p}</div>
                    <div style={{ fontSize: 10, color: "#94A3B8" }}>{PERIOD_TIMES[p]}</div>
                  </td>
                  {DAYS.map(d => {
                    const slot = getSlot(d, p);
                    return (
                      <td key={d} style={{ ...tdStyle, cursor: "pointer", transition: "background 0.15s" }}
                        onClick={() => openEdit(d, p)}
                        onMouseEnter={e => (e.currentTarget.style.background = "#F0FDF4")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        {slot ? (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#E91E8C", fontWeight: 600, fontSize: 13 }}>{slot.subject}</div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>
                              {staff.find((s: any) => s.id === slot.teacherId)?.firstName || ""}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", color: "#CBD5E1", fontSize: 12 }}>+ Add</div>
                        )}
                        {slot && (
                          <div style={{ textAlign: "center", marginTop: 4 }}>
                            <button onClick={e => { e.stopPropagation(); deleteSlot.mutate(slot.id); }}
                              style={{ fontSize: 10, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>
                              remove
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#1E293B", fontSize: 16 }}>
              {editing.day} — Period {editing.period}
              <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>({PERIOD_TIMES[editing.period]})</span>
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Mathematics" autoFocus
                style={{ width: "100%", padding: "9px 12px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>Teacher</label>
              <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, fontFamily: "'Poppins', sans-serif" }}>
                <option value="">None</option>
                {staff.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveSlot.mutate()} disabled={!form.subject}
                style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, #E91E8C, #c0166d)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                Save
              </button>
              <button onClick={() => setEditing(null)}
                style={{ flex: 1, padding: "10px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, color: "#374151", cursor: "pointer", fontFamily: "'Poppins', sans-serif" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 8px", background: "#1B4D4D", color: "#fff", fontWeight: 600,
  fontSize: 13, border: "1px solid #dde5ee", textAlign: "center",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 8px", border: "1px solid #E2E8F0", verticalAlign: "middle", minHeight: 56,
};
