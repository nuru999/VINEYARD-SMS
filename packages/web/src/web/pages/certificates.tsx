import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Award, Printer, Trash2 } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { api } from "../lib/api";

const empty = { studentId: "", type: "leaving", issuedDate: new Date().toISOString().slice(0, 10), notes: "" };

export default function CertificatesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [preview, setPreview] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: async () => { const r = await (await api.certificates.$get()).json(); return (r as any).certificates ?? r; },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; },
  });

  const save = useMutation({
    mutationFn: async (f: any) => (await api.certificates.$post({ json: { ...f, studentId: parseInt(f.studentId) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["certificates"] }); setModal(false); setForm(empty); },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await api.certificates[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates"] }),
  });

  const getStudentName = (id: number) => studentsData?.students?.find((s: any) => s.id === id)?.name || `Student #${id}`;
  const getStudent = (id: number) => studentsData?.students?.find((s: any) => s.id === id);

  const handlePrint = (cert: any) => {
    const student = getStudent(cert.studentId);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cert.type.toUpperCase()} CERTIFICATE</title>
        <style>
          body { font-family: 'Georgia', serif; padding: 60px; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; }
          .school { font-size: 28px; font-weight: bold; color: #1a1a1a; }
          .subtitle { color: #666; font-size: 14px; }
          h2 { text-align: center; font-size: 22px; text-transform: uppercase; letter-spacing: 3px; color: #4ADE80; border-bottom: 2px solid #4ADE80; padding-bottom: 10px; }
          .content { font-size: 16px; line-height: 2; margin: 30px 0; }
          .name { font-size: 22px; font-weight: bold; text-decoration: underline; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; }
          .sig { border-top: 1px solid #000; padding-top: 8px; text-align: center; width: 180px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school">VINEYARD SCHOOL</div>
          <div class="subtitle">School Management System</div>
        </div>
        <h2>${cert.type} Certificate</h2>
        <div class="content">
          <p>This is to certify that <span class="name">${student?.name || "___________"}</span>,
          Admission No: <strong>${student?.admissionNo || "___"}</strong>,
          ${cert.type === "leaving" ? "has successfully completed their studies at Vineyard School and is leaving this institution on " + cert.issuedDate + "." : ""}
          ${cert.type === "character" ? "has been a student of good character and conduct throughout their time at Vineyard School." : ""}
          ${cert.type === "bonafide" ? "is a bona fide student of Vineyard School as of " + cert.issuedDate + "." : ""}
          </p>
          ${cert.notes ? `<p><em>Notes: ${cert.notes}</em></p>` : ""}
          <p>Issued on: <strong>${cert.issuedDate}</strong></p>
        </div>
        <div class="footer">
          <div class="sig">Class Teacher</div>
          <div class="sig">Principal</div>
          <div class="sig">School Stamp</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Layout title="Certificates" action={<Button onClick={() => setModal(true)}><Plus size={15} /> Issue Certificate</Button>}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Student", "Certificate Type", "Issued Date", "Notes", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</td></tr>
            ) : (Array.isArray(data) ? data : []).length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                <Award size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
                No certificates issued yet
              </td></tr>
            ) : (Array.isArray(data) ? data : []).map((cert: any) => (
              <tr key={cert.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{getStudentName(cert.studentId)}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={cert.type}>{cert.type}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{cert.issuedDate}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{cert.notes || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => handlePrint(cert)}><Printer size={13} /> Print</Button>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete?")) remove.mutate(cert.id); }}><Trash2 size={13} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Issue Certificate">
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Student" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}
            options={(studentsData?.students || []).map((s: any) => ({ value: String(s.id), label: `${s.name} (${s.admissionNo})` }))} />
          <Select label="Certificate Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            options={[{ value: "leaving", label: "Leaving Certificate" }, { value: "character", label: "Character Certificate" }, { value: "bonafide", label: "Bonafide Certificate" }]} />
          <Input label="Issue Date" type="date" value={form.issuedDate} onChange={e => setForm({ ...form, issuedDate: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Issue Certificate</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
