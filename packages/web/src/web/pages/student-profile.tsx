import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { ArrowLeft, Printer, MessageCircle, User, Phone, Mail, MapPin, Calendar, BookOpen, CreditCard, CheckSquare } from "lucide-react";

const SCHOOL_NAME = "Vineyard Primary School";
const SCHOOL_MOTTO = "Fruitful Development";

const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;
const pct = (a: number, b: number) => (b === 0 ? "0" : ((a / b) * 100).toFixed(0));

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; font-size: 13px; }
      h1 { font-size: 20px; font-weight: 800; color: #1B4D4D; }
      h2 { font-size: 13px; font-weight: 700; color: #1B4D4D; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #1B4D4D; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; }
      td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 20px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
      .info-row { padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; gap: 12px; }
      .info-label { color: #64748b; font-size: 11px; min-width: 130px; }
      .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
      .stat-num { font-size: 22px; font-weight: 800; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { button { display: none !important; } }
    </style>
  </head><body>${html}
    <div class="footer">Printed on ${new Date().toLocaleString("en-KE")} · ${SCHOOL_NAME} · ${SCHOOL_MOTTO}</div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(params.id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-profile", id],
    queryFn: async () => {
      const r = await fetch(`/api/students/${id}/profile`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!id,
  });

  const student = data?.student;
  const feeSummary = data?.feeSummary;
  const payments: any[] = data?.payments ?? [];
  const attendanceSummary = data?.attendanceSummary ?? { total: 0, present: 0, absent: 0, late: 0, leave: 0 };

  const handlePrint = () => {
    if (!student) return;
    const paymentRows = payments.map(p => `
      <tr>
        <td>${p.receiptNo ?? "—"}</td>
        <td>${p.feeStructureName ?? "Fee Payment"}</td>
        <td>${p.paymentDate}</td>
        <td style="text-transform:capitalize">${p.paymentMethod}</td>
        <td>${p.term ?? "—"}</td>
        <td style="color:#166534;font-weight:600">${fmt(p.paidAmount)}</td>
        <td style="color:${p.balance > 0 ? "#991b1b" : "#166534"}">${fmt(p.balance)}</td>
      </tr>`).join("");

    printHTML(`
      <div class="header">
        <div>
          <div style="font-size:10px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${SCHOOL_MOTTO}</div>
          <h1>${SCHOOL_NAME}</h1>
          <div style="font-size:12px;color:#64748b;margin-top:2px">Student Profile Report</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#64748b">
          <div style="font-size:16px;font-weight:800;color:#1B4D4D">${student.name}</div>
          <div>${student.admissionNo} · ${student.className ?? "No Class"}</div>
        </div>
      </div>

      <h2>Student Information</h2>
      <div class="info-row"><span class="info-label">Admission No.</span><span>${student.admissionNo}</span></div>
      <div class="info-row"><span class="info-label">Class</span><span>${student.className ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Gender</span><span>${student.gender ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Date of Birth</span><span>${student.dob ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Admission Date</span><span>${student.admissionDate ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Address</span><span>${student.address ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Parent/Guardian</span><span>${student.parentName ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Parent Phone</span><span>${student.parentPhone ?? "—"}</span></div>
      <div class="info-row"><span class="info-label">Parent Email</span><span>${student.parentEmail ?? "—"}</span></div>

      <h2>Fee Summary</h2>
      <div class="grid2">
        <div class="stat-box"><div class="stat-num" style="color:#22c55e">${fmt(feeSummary?.totalPaid ?? 0)}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Total Paid</div></div>
        <div class="stat-box"><div class="stat-num" style="color:#ef4444">${fmt(feeSummary?.totalBalance ?? 0)}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Outstanding</div></div>
      </div>
      ${payments.length > 0 ? `
        <table>
          <thead><tr><th>Receipt</th><th>Fee Type</th><th>Date</th><th>Method</th><th>Term</th><th>Paid</th><th>Balance</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>` : "<p style='color:#94a3b8;font-size:12px;margin-top:8px'>No payments recorded.</p>"}

      <h2>Attendance Summary</h2>
      <div class="grid2">
        <div class="stat-box"><div class="stat-num" style="color:#22c55e">${attendanceSummary.present}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Present</div></div>
        <div class="stat-box"><div class="stat-num" style="color:#ef4444">${attendanceSummary.absent}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Absent</div></div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#64748b">
        Attendance rate: <strong>${pct(attendanceSummary.present, attendanceSummary.total)}%</strong> 
        (${attendanceSummary.present} present / ${attendanceSummary.total} total days recorded)
      </div>
    `, `Profile — ${student.name}`);
  };

  if (isLoading) {
    return (
      <Layout title="Student Profile">
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTop: "3px solid #E91E8C", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </Layout>
    );
  }

  if (isError || !student) {
    return (
      <Layout title="Student Profile">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#EF4444", marginBottom: 8 }}>Student not found</div>
          <button onClick={() => navigate("/students")} style={{ padding: "8px 18px", background: "#1B4D4D", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Back to Students
          </button>
        </div>
      </Layout>
    );
  }

  const attendancePct = parseInt(pct(attendanceSummary.present, attendanceSummary.total));

  return (
    <Layout title={student.name} action={
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => navigate("/students")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
          <ArrowLeft size={14} /> Back
        </button>
        {student.parentPhone && (
          <a href={`https://wa.me/${student.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${student.parentName ?? "Parent"}, this is ${SCHOOL_NAME} regarding ${student.name}.`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#25D366", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
            <MessageCircle size={14} /> WhatsApp Parent
          </a>
        )}
        <button onClick={handlePrint}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#1B4D4D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Printer size={14} /> Print Profile
        </button>
      </div>
    }>

      {/* Top — student info card */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 }}>

        {/* Avatar + quick info */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1B4D4D, #E91E8C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: "#fff", fontWeight: 800 }}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1E293B" }}>{student.name}</div>
            <div style={{ fontSize: 13, color: "#E91E8C", fontWeight: 600, marginTop: 2 }}>{student.admissionNo}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{student.className ?? "No Class"}</div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: "capitalize", padding: "4px 14px", borderRadius: 20,
            background: student.status === "active" ? "#DCFCE7" : "#FEF2F2",
            color: student.status === "active" ? "#166534" : "#991B1B"
          }}>
            {student.status}
          </span>
        </div>

        {/* Details grid */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 16, letterSpacing: 0.5 }}>Student Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { icon: <User size={14} />, label: "Gender", value: student.gender ?? "—" },
              { icon: <Calendar size={14} />, label: "Date of Birth", value: student.dob ?? "—" },
              { icon: <BookOpen size={14} />, label: "Admission Date", value: student.admissionDate ?? "—" },
              { icon: <MapPin size={14} />, label: "Address", value: student.address ?? "—" },
              { icon: <User size={14} />, label: "Parent / Guardian", value: student.parentName ?? "—" },
              { icon: <Phone size={14} />, label: "Parent Phone", value: student.parentPhone ?? "—" },
              { icon: <Mail size={14} />, label: "Parent Email", value: student.parentEmail ?? "—" },
            ].map(({ icon, label, value }) => (
              <div key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 3 }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 13, color: "#1E293B", fontWeight: value === "—" ? 400 : 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Billed", value: fmt(feeSummary?.totalAmount ?? 0), color: "#1E293B" },
          { label: "Total Paid", value: fmt(feeSummary?.totalPaid ?? 0), color: "#22C55E" },
          { label: "Outstanding", value: fmt(feeSummary?.totalBalance ?? 0), color: feeSummary?.totalBalance > 0 ? "#EF4444" : "#22C55E" },
          { label: "Attendance Rate", value: `${attendancePct}%`, color: attendancePct >= 75 ? "#22C55E" : "#F59E0B" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bottom — two panels */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

        {/* Fee History */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={16} style={{ color: "#E91E8C" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Fee History</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94A3B8" }}>{payments.length} records</span>
          </div>
          {payments.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No payments recorded yet</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Receipt", "Fee Type", "Term", "Paid", "Balance", "Method", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#E91E8C", fontWeight: 700 }}>{p.receiptNo ?? "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#1E293B" }}>{p.feeStructureName ?? "Fee Payment"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{p.term ?? "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{fmt(p.paidAmount)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: p.balance > 0 ? 700 : 400, color: p.balance > 0 ? "#EF4444" : "#22C55E" }}>{fmt(p.balance)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", padding: "2px 8px", borderRadius: 10, background: p.paymentMethod === "mpesa" ? "#DCFCE7" : p.paymentMethod === "bank" ? "#DBEAFE" : "#F3F4F6", color: p.paymentMethod === "mpesa" ? "#166534" : p.paymentMethod === "bank" ? "#1E40AF" : "#374151" }}>
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{p.paymentDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Attendance Panel */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckSquare size={16} style={{ color: "#E91E8C" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Attendance</span>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Attendance rate ring (visual) */}
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: attendancePct >= 75 ? "#22C55E" : "#F59E0B" }}>{attendancePct}%</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Attendance Rate</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{attendanceSummary.total} days recorded</div>
            </div>

            {/* Progress bar */}
            <div style={{ background: "#F1F5F9", borderRadius: 8, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${attendancePct}%`, height: "100%", background: attendancePct >= 75 ? "#22C55E" : "#F59E0B", borderRadius: 8, transition: "width 0.5s" }} />
            </div>

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {[
                { label: "Present", count: attendanceSummary.present, color: "#22C55E", bg: "#DCFCE7" },
                { label: "Absent", count: attendanceSummary.absent, color: "#EF4444", bg: "#FEF2F2" },
                { label: "Late", count: attendanceSummary.late, color: "#F59E0B", bg: "#FFFBEB" },
                { label: "On Leave", count: attendanceSummary.leave, color: "#6366F1", bg: "#EEF2FF" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, padding: "2px 12px", borderRadius: 20, background: bg, color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
