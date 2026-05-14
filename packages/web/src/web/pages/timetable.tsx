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

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => api("/staff") });
  const { data: slots = [] } = useQuery({
    queryKey: ["timetable", selectedClass],
    queryFn: () => api(`/timetable${selectedClass ? `?classId=${selectedClass}` : ""}`),
    enabled: !!selectedClass,
  });

  const saveSlot = useMutation({
    mutationFn: async () => {
      if (!editing || !selectedClass) return;
      const existing = slots.find((s: any) => s.day === editing.day && s.period === editing.period);
      const payload = {
        classId: selectedClass, day: editing.day, period: editing.period,
        subject: form.subject, teacherId: form.teacherId ? Number(form.teacherId) : null,
      };
      if (existing) return api(`/timetable/${existing.id}`, { method: "PUT", body: payload });
      return api("/timetable", { method: "POST", body: payload });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timetable"] }); setEditing(null); },
  });

  const deleteSlot = useMutation({
    mutationFn: (id: number) => api(`/timetable/${id}`, { method: "DELETE" }),
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
    th,td{border:1px solid #999;padding:8px;text-align:center;font-size:12px}th{background:#1B4D4D;color:white}
    .period-time{font-size:10px;color:#666}</style></head><body>
    <h2>Vineyard Primary School</h2><h3 style="text-align:center">Timetable — ${cls?.name}</h3>
    <table><tr><th>Period</th>${DAYS.map(d => `<th>${d}</th>`).join("")}</tr>
    ${PERIODS.map(p => `<tr><td><b>Period ${p}</b><br><span class="period-time">${PERIOD_TIMES[p]}</span></td>
    ${DAYS.map(d => { const s = getSlot(d, p); return `<td>${s ? `<b>${s.subject}</b>` : ""}</td>`; }).join("")}</tr>`).join("")}
    </table></body></html>`);
    win.document.close(); win.print();
  };

  return (
    <Layout title="Timetable">
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value) || null)}
          style={{ padding: "8px 14px", background: "#161B22", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
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
        <div style={{ textAlign: "center", padding: 80, color: "#8B949E" }}>Select a class to view or edit its timetable</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 90 }}>Period</th>
                {DAYS.map(d => <th key={d} style={thStyle}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p}>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div style={{ fontWeight: 600, color: "#F0F6FC" }}>P{p}</div>
                    <div style={{ fontSize: 11, color: "#8B949E" }}>{PERIOD_TIMES[p]}</div>
                  </td>
                  {DAYS.map(d => {
                    const slot = getSlot(d, p);
                    return (
                      <td key={d} style={{ ...tdStyle, cursor: "pointer", transition: "background 0.15s" }}
                        onClick={() => openEdit(d, p)}
                        onMouseEnter={e => (e.currentTarget.style.background = "#1c2128")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}>
                        {slot ? (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ color: "#E91E8C", fontWeight: 600, fontSize: 13 }}>{slot.subject}</div>
                            <div style={{ fontSize: 11, color: "#8B949E" }}>
                              {staff.find((s: any) => s.id === slot.teacherId)?.firstName || ""}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", color: "#30363D", fontSize: 12 }}>+ Add</div>
                        )}
                        {slot && (
                          <div style={{ textAlign: "center", marginTop: 4 }}>
                            <button onClick={e => { e.stopPropagation(); deleteSlot.mutate(slot.id); }}
                              style={{ fontSize: 10, color: "#F85149", background: "none", border: "none", cursor: "pointer" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 28, width: 360 }}>
            <h3 style={{ margin: "0 0 16px", color: "#F0F6FC" }}>{editing.day} — Period {editing.period} ({PERIOD_TIMES[editing.period]})</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#8B949E" }}>Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Mathematics" autoFocus
                style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#8B949E" }}>Teacher</label>
              <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 }}>
                <option value="">None</option>
                {staff.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveSlot.mutate()} disabled={!form.subject}
                style={{ flex: 1, padding: "10px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                Save
              </button>
              <button onClick={() => setEditing(null)}
                style={{ flex: 1, padding: "10px", background: "#21262D", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", cursor: "pointer" }}>
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
  fontSize: 13, border: "1px solid #30363D", textAlign: "center",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 8px", border: "1px solid #30363D", verticalAlign: "middle", minHeight: 56,
};
