import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { DollarSign, AlertTriangle, ReceiptText, ShieldCheck } from "lucide-react";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

const fmt = (value: number) => `KES ${Number(value || 0).toLocaleString("en-KE")}`;

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: "#FCE7F3", color: "#BE185D", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}

export default function PrincipalFeesPage() {
  const ledger = useQuery({
    queryKey: ["fee-payments", "principal-readonly"],
    queryFn: async () => parseResponse(await fetch("/api/fee-payments", { credentials: "include" })),
  });
  const defaulters = useQuery({
    queryKey: ["fee-defaulters", "principal-readonly"],
    queryFn: async () => parseResponse(await fetch("/api/fee-payments/defaulters", { credentials: "include" })),
  });
  const students = useQuery({
    queryKey: ["fee-students", "principal-readonly"],
    queryFn: async () => parseResponse(await fetch("/api/fee-payments/students", { credentials: "include" })),
  });
  const classes = useQuery({
    queryKey: ["classes", "principal-fees"],
    queryFn: async () => parseResponse(await fetch("/api/classes", { credentials: "include" })),
  });

  const payments: any[] = Array.isArray((ledger.data as any)?.payments) ? (ledger.data as any).payments : [];
  const summary = (ledger.data as any)?.summary || {};
  const defaulterRows: any[] = Array.isArray((defaulters.data as any)?.defaulters) ? (defaulters.data as any).defaulters : [];
  const studentRows: any[] = Array.isArray((students.data as any)?.students) ? (students.data as any).students : [];
  const classRows: any[] = Array.isArray((classes.data as any)?.classes) ? (classes.data as any).classes : [];
  const loading = ledger.isLoading || defaulters.isLoading || students.isLoading || classes.isLoading;
  const error = ledger.error || defaulters.error || students.error || classes.error;

  const studentById = new Map(studentRows.map((student) => [student.id, student]));
  const classById = new Map(classRows.map((cls) => [cls.id, cls]));
  const recentPayments = [...payments]
    .sort((a, b) => String(b.paymentDate || "").localeCompare(String(a.paymentDate || "")))
    .slice(0, 12);

  return (
    <Layout title="Fees & Payments">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg,#1B4D4D,#0f2e2e)", color: "#fff", borderRadius: 16, padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800 }}>Fee oversight</div>
            <div style={{ marginTop: 5, fontSize: 13, opacity: 0.78 }}>Monitor collections, outstanding balances and recent receipts across the school.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.12)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
            <ShieldCheck size={16} /> Principal · Read only
          </div>
        </div>

        {error ? (
          <div style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 12, padding: 16 }}>
            Unable to load fee oversight: {(error as Error).message}
          </div>
        ) : loading ? (
          <div style={{ color: "#64748B", padding: 24 }}>Loading finance overview…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              <SummaryCard label="Total collected" value={fmt(Number(summary.totalCollected || 0))} icon={<DollarSign size={20} />} />
              <SummaryCard label="Outstanding" value={fmt(Number(summary.totalOutstanding || (defaulters.data as any)?.totalOutstanding || 0))} icon={<AlertTriangle size={20} />} />
              <SummaryCard label="Payment receipts" value={payments.length} icon={<ReceiptText size={20} />} />
              <SummaryCard label="Students owing" value={Number((defaulters.data as any)?.count || defaulterRows.length)} icon={<AlertTriangle size={20} />} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(280px,0.8fr)", gap: 16 }}>
              <section style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0", fontWeight: 800, color: "#1E293B" }}>Recent payments</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", color: "#64748B", textAlign: "left" }}>
                        <th style={{ padding: 11 }}>Receipt</th><th style={{ padding: 11 }}>Student</th><th style={{ padding: 11 }}>Class</th><th style={{ padding: 11 }}>Date</th><th style={{ padding: 11 }}>Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: 18, color: "#64748B" }}>No fee payments recorded yet.</td></tr>
                      ) : recentPayments.map((payment) => {
                        const student = studentById.get(payment.studentId) as any;
                        const cls = classById.get(student?.classId) as any;
                        return (
                          <tr key={payment.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                            <td style={{ padding: 11, fontWeight: 700 }}>{payment.receiptNo || `#${payment.id}`}</td>
                            <td style={{ padding: 11 }}>{student?.name || `Student #${payment.studentId}`}</td>
                            <td style={{ padding: 11 }}>{cls?.name || "—"}</td>
                            <td style={{ padding: 11 }}>{payment.paymentDate || "—"}</td>
                            <td style={{ padding: 11, fontWeight: 700, color: "#166534" }}>{fmt(Number(payment.paidAmount || 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0", fontWeight: 800, color: "#1E293B" }}>Largest outstanding balances</div>
                <div>
                  {defaulterRows.length === 0 ? (
                    <div style={{ padding: 18, color: "#64748B" }}>No outstanding fee balances.</div>
                  ) : defaulterRows.slice(0, 10).map((row: any, index: number) => (
                    <div key={row.student?.id || index} style={{ padding: "12px 18px", borderTop: index === 0 ? "none" : "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B" }}>{row.student?.name || "Unknown student"}</div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{row.class?.name || "No class"}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#991B1B", whiteSpace: "nowrap" }}>{fmt(Number(row.totalOwed || 0))}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}