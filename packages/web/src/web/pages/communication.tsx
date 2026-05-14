import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "../components/layout";
import { api } from "../lib/api";

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [form, setForm] = useState({ subject: "", body: "", recipientType: "all", recipientId: "" });
  const [sent, setSent] = useState(false);

  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: () => api("/students") });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const { data: msgs = [] } = useQuery({ queryKey: ["messages"], queryFn: () => api("/messages") });

  const sendMsg = useMutation({
    mutationFn: () => api("/messages", {
      method: "POST",
      body: { ...form, recipientId: form.recipientId ? Number(form.recipientId) : null },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      setForm({ subject: "", body: "", recipientType: "all", recipientId: "" });
    },
  });

  const deleteMsg = useMutation({
    mutationFn: (id: number) => api(`/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });

  // Build WhatsApp link from message body
  const buildWhatsApp = () => {
    const text = encodeURIComponent(`*${form.subject}*\n\n${form.body}\n\n— Vineyard Primary School`);
    return `https://wa.me/?text=${text}`;
  };

  const recipientLabel = (msg: any) => {
    if (msg.recipientType === "all") return "All Parents";
    if (msg.recipientType === "class") {
      const cls = classes.find((c: any) => c.id === msg.recipientId);
      return `Class: ${cls?.name || msg.recipientId}`;
    }
    const s = students.find((s: any) => s.id === msg.recipientId);
    return s ? `${s.firstName} ${s.lastName}` : "Individual";
  };

  return (
    <Layout title="Parent Communication">
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#161B22", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["compose", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, textTransform: "capitalize",
              background: tab === t ? "#E91E8C" : "transparent", color: tab === t ? "#fff" : "#8B949E" }}>
            {t === "compose" ? "📝 Compose" : "📋 History"}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div style={{ maxWidth: 640 }}>
          <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 24 }}>
            {sent && (
              <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid #4ADE80", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#4ADE80", fontSize: 14 }}>
                ✓ Message saved! Use WhatsApp or SMS to send.
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Send To</label>
              <select value={form.recipientType} onChange={e => setForm(f => ({ ...f, recipientType: e.target.value, recipientId: "" }))} style={selectStyle}>
                <option value="all">All Parents</option>
                <option value="class">Specific Class</option>
                <option value="individual">Individual Student</option>
              </select>
            </div>

            {form.recipientType === "class" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Class</label>
                <select value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} style={selectStyle}>
                  <option value="">Select class</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {form.recipientType === "individual" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Student</label>
                <select value={form.recipientId} onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))} style={selectStyle}>
                  <option value="">Select student</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Fee Reminder - Term 2" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Message</label>
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Type your message here..." rows={5}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => sendMsg.mutate()} disabled={!form.subject || !form.body}
                style={{ padding: "10px 20px", background: "#E91E8C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                💾 Save Message
              </button>
              {form.subject && form.body && (
                <a href={buildWhatsApp()} target="_blank" rel="noreferrer"
                  style={{ padding: "10px 20px", background: "#25D366", border: "none", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  📱 Send via WhatsApp
                </a>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 16, background: "rgba(27,77,77,0.2)", border: "1px solid #1B4D4D", borderRadius: 10, fontSize: 13, color: "#8B949E" }}>
            <strong style={{ color: "#F0F6FC" }}>Tip:</strong> Save the message first, then use the WhatsApp button to open WhatsApp Web with the message pre-filled. You can then send it to parent groups.
          </div>
        </div>
      )}

      {tab === "history" && (
        <div>
          {msgs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8B949E" }}>No messages sent yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {msgs.map((msg: any) => (
                <div key={msg.id} style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#F0F6FC", marginBottom: 4 }}>{msg.subject}</div>
                      <div style={{ fontSize: 12, color: "#8B949E" }}>
                        To: <span style={{ color: "#E91E8C" }}>{recipientLabel(msg)}</span> &nbsp;·&nbsp;
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString("en-KE") : ""}
                      </div>
                    </div>
                    <button onClick={() => deleteMsg.mutate(msg.id)}
                      style={{ background: "none", border: "none", color: "#F85149", cursor: "pointer", fontSize: 12 }}>
                      Delete
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "#8B949E", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.body}</div>
                  <div style={{ marginTop: 12 }}>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`*${msg.subject}*\n\n${msg.body}\n\n— Vineyard Primary School`)}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "#25D366", textDecoration: "none" }}>
                      📱 Resend via WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, color: "#8B949E" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0D1117", border: "1px solid #30363D", borderRadius: 8, color: "#F0F6FC", fontSize: 14 };
const selectStyle: React.CSSProperties = { ...inputStyle };
