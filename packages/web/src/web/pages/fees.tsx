import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, MessageCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { Card, StatCard } from "../components/ui/card";
import { api } from "../lib/api";
import { DollarSign, TrendingDown, AlertCircle } from "lucide-react";

const emptyStructure = { name: "", amount: "", classId: "", frequency: "monthly" };
const emptyPayment = { studentId: "", feeStructureId: "", amount: "", paidAmount: "", discount: "0", balance: "0", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "cash", notes: "" };

type Tab = "payments" | "defaulters" | "structures";

export default function FeesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("payments");
  const [structureModal, setStructureModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [sf, setSf] = useState<any>(emptyStructure);
  const [pf, setPf] = useState<any>(emptyPayment);

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => { const r = await (await api["fee-payments"].$get()).json(); return (r as any).payments ?? r; },
  });

  const { data: defaultersData, isLoading: defaultersLoading } = useQuery({
    queryKey: ["fee-defaulters"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments/defaulters", { credentials: "include" });
      return r.json();
    },
  });

  const { data: structuresData } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => { const r = await (await api["fee-structures"].$get()).json(); return (r as any).feeStructures ?? r; },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { const r = await (await api.students.$get()).json(); return (r as any).students ?? r; },
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => { const r = await (await api.classes.$get()).json(); return (r as any).classes ?? r; },
  });

  const saveStructure = useMutation({
    mutationFn: async (f: any) => (await api["fee-structures"].$post({ json: { ...f, amount: parseFloat(f.amount), classId: parseInt(f.classId) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-structures"] }); setStructureModal(false); setSf(emptyStructure); },
  });

  const savePayment = useMutation({
    mutationFn: async (f: any) => {
      const amt = parseFloat(f.amount);
      const paid = parseFloat(f.paidAmount);
      const disc = parseFloat(f.discount || "0");
      const bal = amt - paid - disc;
      return (await api["fee-payments"].$post({ json: { ...f, studentId: parseInt(f.studentId), amount: amt, paidAmount: paid, discount: disc, balance: bal, feeStructureId: f.feeStructureId ? parseInt(f.feeStructureId) : null } })).json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["fee-defaulters"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPaymentModal(false);
      setPf(emptyPayment);
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: number) => (await api["fee-payments"][":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["fee-defaulters"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const totalCollected = paymentsData?.payments?.reduce((s: number, p: any) => s + (p.paidAmount || 0), 0) || 0;
  const totalBalance = paymentsData?.payments?.reduce((s: number, p: any) => s + (p.balance || 0), 0) || 0;
  const defaulterCount = defaultersData?.count || 0;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "payments", label: "Payment Records" },
    { key: "defaulters", label: "Defaulters", count: defaulterCount },
    { key: "structures", label: "Fee Structures" },
  ];

  return (
    <Layout title="Fees & Payments" action={
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={() => setStructureModal(true)}><Plus size={14} /> Fee Structure</Button>
        <Button onClick={() => setPaymentModal(true)}><Plus size={15} /> Record Payment</Button>
      </div>
    }>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Collected" value={`KES ${totalCollected.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <StatCard label="Outstanding" value={`KES ${totalBalance.toLocaleString()}`} icon={<AlertCircle size={20} />} color="#E3B341" />
        <StatCard label="Transactions" value={paymentsData?.payments?.length || 0} icon={<TrendingDown size={20} />} color="#58A6FF" />
        <StatCard label="Defaulters" value={defaulterCount} icon={<AlertTriangle size={20} />} color="#F85149" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 18px", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ background: "#F85149", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Defaulters */}
      {tab === "defaulters" && (
        <div>
          {defaultersLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
          ) : defaultersData?.defaulters?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-secondary)" }}>
              <CheckCircle size={48} style={{ marginBottom: 12, color: "#3FB950", opacity: 0.6 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>All clear!</div>
              <div style={{ fontSize: 13 }}>No fee defaulters found.</div>
            </div>
          ) : (
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Student", "Admission No", "Class", "Parent", "Total Paid", "Outstanding", "Action"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {defaultersData.defaulters.map((d: any) => (
                    <tr key={d.student?.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{d.student?.name || "Unknown"}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{d.student?.admissionNo || "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{d.class?.name || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{d.student?.parentName || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.student?.parentPhone || ""}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 500, color: "#3FB950" }}>
                        KES {d.totalPaid?.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700, color: "#F85149",
                          background: "rgba(248,81,73,0.1)", padding: "3px 10px", borderRadius: 8,
                        }}>
                          KES {d.totalOwed?.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {d.student?.parentPhone ? (
                          <a
                            href={`https://wa.me/${d.student.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${d.student?.parentName || "Parent"}, this is a reminder that ${d.student?.name} has an outstanding fee balance of KES ${d.totalOwed?.toLocaleString()} at Vineyard Primary School. Please settle at your earliest convenience. Thank you.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 600,
                              padding: "6px 12px", borderRadius: 8, textDecoration: "none",
                            }}
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>No phone</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{defaulterCount} student{defaulterCount !== 1 ? "s" : ""} with outstanding balances</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F85149" }}>
                  Total Outstanding: KES {defaultersData.defaulters.reduce((s: number, d: any) => s + d.totalOwed, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Payment Records */}
      {tab === "payments" && (
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Receipt No", "Student ID", "Amount", "Paid", "Balance", "Method", "Date", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</td></tr>
              ) : paymentsData?.payments?.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No payments recorded yet</td></tr>
              ) : paymentsData?.payments?.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{p.receiptNo}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>#{p.studentId}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>KES {p.amount?.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#3FB950" }}>KES {p.paidAmount?.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: p.balance > 0 ? "var(--warning)" : "#3FB950" }}>KES {p.balance?.toLocaleString()}</td>
                  <td style={{ padding: "10px 14px" }}><Badge status={p.paymentMethod} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{p.paymentDate}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete payment?")) deletePayment.mutate(p.id); }}><Trash2 size={13} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Fee Structures */}
      {tab === "structures" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {structuresData?.feeStructures?.length === 0 ? (
            <Card style={{ fontSize: 13, color: "var(--text-secondary)" }}>No fee structures yet. Click "Fee Structure" above to add one.</Card>
          ) : structuresData?.feeStructures?.map((fs: any) => (
            <Card key={fs.id} style={{ minWidth: 200, flex: "1 1 200px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{fs.name}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>KES {fs.amount?.toLocaleString()}</div>
              <Badge status={fs.frequency} />
              {fs.classId && (
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                  Class: {classesData?.classes?.find((c: any) => c.id === fs.classId)?.name || `#${fs.classId}`}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Fee Structure Modal */}
      <Modal open={structureModal} onClose={() => setStructureModal(false)} title="Add Fee Structure">
        <form onSubmit={e => { e.preventDefault(); saveStructure.mutate(sf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Fee Name" value={sf.name} onChange={e => setSf({ ...sf, name: e.target.value })} placeholder="e.g. Tuition Fee" required />
          <Input label="Amount (KES)" type="number" value={sf.amount} onChange={e => setSf({ ...sf, amount: e.target.value })} required />
          <Select label="Class" value={sf.classId} onChange={e => setSf({ ...sf, classId: e.target.value })}
            options={(classesData?.classes || []).map((c: any) => ({ value: String(c.id), label: c.name }))} />
          <Select label="Frequency" value={sf.frequency} onChange={e => setSf({ ...sf, frequency: e.target.value })}
            options={[{ value: "monthly", label: "Monthly" }, { value: "termly", label: "Termly" }, { value: "annual", label: "Annual" }, { value: "once", label: "One-time" }]} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setStructureModal(false)}>Cancel</Button>
            <Button type="submit" loading={saveStructure.isPending}>Add Structure</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Record Payment" width={540}>
        <form onSubmit={e => { e.preventDefault(); savePayment.mutate(pf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Student" value={pf.studentId} onChange={e => setPf({ ...pf, studentId: e.target.value })}
            options={(studentsData?.students || []).map((s: any) => ({ value: String(s.id), label: `${s.name} (${s.admissionNo})` }))} />
          <Select label="Fee Type" value={pf.feeStructureId} onChange={e => setPf({ ...pf, feeStructureId: e.target.value })}
            options={(structuresData?.feeStructures || []).map((fs: any) => ({ value: String(fs.id), label: `${fs.name} - KES ${fs.amount}` }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Total Amount (KES)" type="number" value={pf.amount} onChange={e => setPf({ ...pf, amount: e.target.value })} required />
            <Input label="Amount Paid (KES)" type="number" value={pf.paidAmount} onChange={e => setPf({ ...pf, paidAmount: e.target.value })} required />
            <Input label="Discount (KES)" type="number" value={pf.discount} onChange={e => setPf({ ...pf, discount: e.target.value })} />
            <Input label="Payment Date" type="date" value={pf.paymentDate} onChange={e => setPf({ ...pf, paymentDate: e.target.value })} />
            <Select label="Payment Method" value={pf.paymentMethod} onChange={e => setPf({ ...pf, paymentMethod: e.target.value })}
              options={[{ value: "cash", label: "Cash" }, { value: "mpesa", label: "M-Pesa" }, { value: "bank", label: "Bank Transfer" }]} />
          </div>
          <Input label="Notes" value={pf.notes} onChange={e => setPf({ ...pf, notes: e.target.value })} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setPaymentModal(false)}>Cancel</Button>
            <Button type="submit" loading={savePayment.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
