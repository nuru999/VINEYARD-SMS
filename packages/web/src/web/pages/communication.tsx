import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { useToast } from "../components/ui/toast";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function CommunicationPage() {
  const qc = useQueryClient();
  const { isAdmin, isPrincipal } = useRole();
  const canDeleteMessages = isAdmin || isPrincipal;
  const { error: toastError } = useToast();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [form, setForm] = useState({ subject: "", body: "", recipientType: "all", recipientId: "" });
  const [sent, setSent] = useState(false);

  const { data: recipientsData } = useQuery({
    queryKey: ["message-recipients"],
    queryFn: async () => parseResponse(await api.messages.recipients.$get()),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => parseResponse(await api.messages.$get()),
  });

  const safeClasses = Array.isArray((recipientsData as any)?.classes) ? (recipientsData as any).classes : [];
  const safeStudents = Array.isArray((recipientsData as any)?.students) ? (recipientsData as any).students : [];
  const canSendAll = Boolean((recipientsData as any)?.canSendAll);
  const safeMsgs = Array.isArray(msgs) ? msgs as any[] : [];

  useEffect(() => {
    if (recipientsData && !canSendAll && form.recipientType === "all") {
      setForm((current) => ({ ...current, recipientType: "class", recipientId: "" }));
    }
  }, [recipientsData, canSendAll, form.recipientType]);

  const sendMsg = useMutation({
    mutationFn: async () => parseResponse(await api.messages.$post({
      json: {
        ...form,
        subject: form.subject.trim(),
        body: form.body.trim(),
        recipientId: form.recipientId ? Number(form.recipientId) : null,
      },
    })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      setSent(true);
      window.setTimeout(() => setSent(false), 3000);
      setForm({ subject: "", body: "", recipientType: canSendAll ? "all" : "class", recipientId: "" });
    },
    onError: (err) => toastError("Could not save message", err instanceof Error ? err.message : "Request failed"),
  });

  const deleteMsg = useMutation({
    mutationFn: async (id: number) => parseResponse(await api.messages[":id"].$delete({ param: { id: String(id) } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
    onError: (err) => toastError("Could not delete message", err instanceof Error ? err.message : "Request failed"),
  });

  const recipientRequired = form.recipientType !== "all";
  const formReady = form.subject.trim() && form.body.trim() && (!recipientRequired || form.recipientId);
  const whatsappText = (subject = form.subject, body = form.body) =>
    `https://wa.me/?text=${encodeURIComponent(`*${subject}*\n\n${body}\n\n— Vineyard Primary School`)}`;

  const recipientLabel = (msg: any) => {
    if (msg.recipientType === "all") return "All Parents";
    if (msg.recipientType === "class") {
      const cls = safeClasses.find((c: any) => c.id === msg.recipientId);
      return `Class: ${cls?.name || `#${msg.recipientId}`}`;
    }
    const student = safeStudents.find((s: any) => s.id === msg.recipientId);
    return student?.name || `Student #${msg.recipientId}`;
  };

  return (
    <Layout title="Parent Communication">
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F1F5F9", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["compose", "history"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={{ ...tabButton, background: tab === item ? "#E91E8C" : "transparent", color: tab === item ? "#fff" : "#64748B" }}>
            {item === "compose" ? "📝 Compose" : "📋 History"}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div style={{ maxWidth: 640 }}>
          <div style={cardStyle}>
            {sent && <div style={successStyle}>✓ Message saved! Use WhatsApp or SMS to send.</div>}

            <Field label="Send To">
              <select value={form.recipientType} onChange={(e) => setForm((f) => ({ ...f, recipientType: e.target.value, recipientId: "" }))} style={inputStyle}>
                {canSendAll && <option value="all">All Parents</option>}
                <option value="class">Specific Class</option>
                <option value="individual">Individual Student</option>
              </select>
            </Field>

            {form.recipientType === "class" && (
              <Field label="Class">
                <select value={form.recipientId} onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))} style={inputStyle}>
                  <option value="">Select class</option>
                  {safeClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}

            {form.recipientType === "individual" && (
              <Field label="Student">
                <select value={form.recipientId} onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))} style={inputStyle}>
                  <option value="">Select student</option>
                  {safeStudents.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            )}

            <Field label="Subject">
              <input maxLength={200} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Fee Reminder - Term 2" style={inputStyle} />
            </Field>

            <Field label="Message">
              <textarea maxLength={5000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Type your message here..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
            </Field>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => sendMsg.mutate()} disabled={!formReady || sendMsg.isPending} style={primaryButton}>
                {sendMsg.isPending ? "Saving..." : "💾 Save Message"}
              </button>
              {form.subject.trim() && form.body.trim() && (
                <a href={whatsappText()} target="_blank" rel="noreferrer" style={whatsappButton}>📱 Send via WhatsApp</a>
              )}
            </div>
          </div>
          <div style={tipStyle}><strong>Tip:</strong> Save the message first, then open WhatsApp with the same text pre-filled.</div>
        </div>
      )}

      {tab === "history" && (
        <div>
          {safeMsgs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94A3B8", fontSize: 15 }}>No messages saved yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {safeMsgs.map((msg: any) => (
                <div key={msg.id} style={historyCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>{msg.subject}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>
                        To: <span style={{ color: "#E91E8C", fontWeight: 600 }}>{recipientLabel(msg)}</span>
                        {msg.sentAt ? ` · ${new Date(msg.sentAt).toLocaleDateString("en-KE")}` : ""}
                      </div>
                    </div>
                    {canDeleteMessages && (
                      <button onClick={() => { if (confirm("Delete this saved message?")) deleteMsg.mutate(msg.id); }} style={deleteButton}>Delete</button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748B", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{msg.body}</div>
                  <div style={{ marginTop: 12 }}>
                    <a href={whatsappText(msg.subject, msg.body)} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#25D366", textDecoration: "none", fontWeight: 600 }}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

const tabButton: React.CSSProperties = { padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, textTransform: "capitalize", fontFamily: "'Poppins', sans-serif" };
const cardStyle: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" };
const historyCard: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Poppins', sans-serif" };
const primaryButton: React.CSSProperties = { padding: "10px 20px", background: "linear-gradient(135deg, #E91E8C, #c0166d)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "'Poppins', sans-serif" };
const whatsappButton: React.CSSProperties = { padding: "10px 20px", background: "#25D366", borderRadius: 8, color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 };
const deleteButton: React.CSSProperties = { background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12 };
const successStyle: React.CSSProperties = { background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#16A34A", fontSize: 14, fontWeight: 500 };
const tipStyle: React.CSSProperties = { marginTop: 16, padding: 16, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, fontSize: 13, color: "#0369A1" };
