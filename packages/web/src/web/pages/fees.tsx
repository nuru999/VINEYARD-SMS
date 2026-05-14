import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Printer } from "lucide-react";
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

export default function FeesPage() {
  const qc = useQueryClient();
  const [structureModal, setStructureModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [sf, setSf] = useState<any>(emptyStructure);
  const [pf, setPf] = useState<any>(emptyPayment);

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => (await api["fee-payments"].$get()).json(),
  });

  const { data: structuresData } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => (await api["fee-structures"].$get()).json(),
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.students.$get()).json(),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.classes.$get()).json(),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-payments"] }); setPaymentModal(false); setPf(emptyPayment); },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: number) => (await api["fee-payments"][":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-payments"] }),
  });

  const totalCollected = paymentsData?.payments?.reduce((s: number, p: any) => s + (p.paidAmount || 0), 0) || 0;
  const totalBalance = paymentsData?.payments?.reduce((s: number, p: any) => s + (p.balance || 0), 0) || 0;

  return (
    <Layout title="Fees & Payments" action={
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={() => setStructureModal(true)}><Plus size={14} /> Fee Structure</Button>
        <Button onClick={() => setPaymentModal(true)}><Plus size={15} /> Record Payment</Button>
      </div>
    }>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Collected" value={`KES ${totalCollected.toLocaleString()}`} icon={<DollarSign size={20} />} />
        <StatCard label="Outstanding Balance" value={`KES ${totalBalance.toLocaleString()}`} icon={<AlertCircle size={20} />} color="#E3B341" />
        <StatCard label="Total Transactions" value={paymentsData?.payments?.length || 0} icon={<TrendingDown size={20} />} color="#58A6FF" />
      </div>

      {/* Fee Structures */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>FEE STRUCTURES</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {structuresData?.feeStructures?.length === 0 ? (
            <Card style={{ fontSize: 13, color: "var(--text-secondary)" }}>No fee structures yet. Add one above.</Card>
          ) : structuresData?.feeStructures?.map((fs: any) => (
            <Card key={fs.id} style={{ minWidth: 180, flex: "1 1 180px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{fs.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>KES {fs.amount?.toLocaleString()}</div>
              <Badge status={fs.frequency} />
            </Card>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>PAYMENT RECORDS</h3>
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
