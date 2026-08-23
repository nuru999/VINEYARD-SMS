import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Award, Printer, Trash2 } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { useToast } from "../components/ui/toast";
import { api } from "../lib/api";
import { useRole } from "../lib/use-role";

const empty = { studentId: "", type: "leaving", issuedDate: new Date().toISOString().slice(0, 10), notes: "" };

async function parseResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function CertificatesPage() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canDelete = role === "admin" || role === "principal";
  const { success, error: toastError } = useToast();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const { data, isLoading } = useQuery({
    queryKey: ["certificates"],
    queryFn: async () => {
      const response = await api.certificates.$get();
      const result = await parseResponse(response);
      return Array.isArray(result) ? result : (result as any).certificates ?? [];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const response = await api.students.$get();
      const result = await parseResponse(response);
      return Array.isArray(result) ? result : (result as any).students ?? [];
    },
  });

  const certificates: any[] = Array.isArray(data) ? data : [];
  const students: any[] = Array.isArray(studentsData) ? studentsData : [];

  const save = useMutation({
    mutationFn: async (certificateForm: any) => {
      if (!certificateForm.studentId) throw new Error("Select a student");
      return parseResponse(await api.certificates.$post({
        json: { ...certificateForm, studentId: parseInt(certificateForm.studentId) },
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      setModal(false);
      setForm(empty);
      success("Certificate issued");
    },
    onError: (error: any) => toastError("Could not issue certificate", error?.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      if (!canDelete) throw new Error("Only school leadership can delete certificates");
      return parseResponse(await api.certificates[":id"].$delete({ param: { id: String(id) } }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
      success("Certificate deleted");
    },
    onError: (error: any) => toastError("Delete failed", error?.message),
  });

  const getStudentName = (id: number) => students.find((student: any) => student.id === id)?.name || `Student #${id}`;
  const getStudent = (id: number) => students.find((student: any) => student.id === id);

  const handlePrint = (cert: any) => {
    const student = getStudent(cert.studentId);
    const studentName = escapeHtml(student?.name || "___________");
    const admissionNo = escapeHtml(student?.admissionNo || "___");
    const issuedDate = escapeHtml(cert.issuedDate);
    const notes = cert.notes ? escapeHtml(cert.notes) : "";
    const type = escapeHtml(cert.type);

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${type.toUpperCase()} CERTIFICATE</title>
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
        <h2>${type} Certificate</h2>
        <div class="content">
          <p>This is to certify that <span class="name">${studentName}</span>,
          Admission No: <strong>${admissionNo}</strong>,
          ${cert.type === "leaving" ? `has successfully completed their studies at Vineyard School and is leaving this institution on ${issuedDate}.` : ""}
          ${cert.type === "character" ? "has been a student of good character and conduct throughout their time at Vineyard School." : ""}
          ${cert.type === "bonafide" ? `is a bona fide student of Vineyard School as of ${issuedDate}.` : ""}
          </p>
          ${notes ? `<p><em>Notes: ${notes}</em></p>` : ""}
          <p>Issued on: <strong>${issuedDate}</strong></p>
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
              {["Student", "Certificate Type", "Issued Date", "Notes", "Actions"].map((heading) => (
                <th key={heading} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</td></tr>
            ) : certificates.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                <Award size={32} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
                No certificates issued yet
              </td></tr>
            ) : certificates.map((cert: any) => (
              <tr key={cert.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{getStudentName(cert.studentId)}</td>
                <td style={{ padding: "12px 16px" }}><Badge status={cert.type}>{cert.type}</Badge></td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{cert.issuedDate}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>{cert.notes || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => handlePrint(cert)}><Printer size={13} /> Print</Button>
                    {canDelete && (
                      <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete this official certificate?")) remove.mutate(cert.id); }}><Trash2 size={13} /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Issue Certificate">
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Student" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            options={[{ value: "", label: "Select student..." }, ...students.map((student: any) => ({ value: String(student.id), label: `${student.name} (${student.admissionNo})` }))]} />
          <Select label="Certificate Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}
            options={[{ value: "leaving", label: "Leaving Certificate" }, { value: "character", label: "Character Certificate" }, { value: "bonafide", label: "Bonafide Certificate" }]} />
          <Input label="Issue Date" type="date" value={form.issuedDate} onChange={(event) => setForm({ ...form, issuedDate: event.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending} disabled={!form.studentId}>Issue Certificate</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
