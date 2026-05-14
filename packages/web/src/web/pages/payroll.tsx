import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { StatCard } from "../components/ui/card";
import { api } from "../lib/api";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const empty = { staffId: "", month: months[new Date().getMonth()], year: new Date().getFullYear(), basicSalary: "", allowances: "0", deductions: "0", paidDate: "", status: "pending" };

export default function PayrollPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => (await api.payroll.$get()).json(),
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => { const r = await (await api.staff.$get()).json(); return (r as any).staff ?? r; },
  });

  const save = useMutation({
    mutationFn: async (f: any) => (await api.payroll.$post({ json: { ...f, staffId: parseInt(f.staffId), basicSalary: parseFloat(f.basicSalary), allowances: parseFloat(f.allowances || "0"), deductions: parseFloat(f.deductions || "0"), year: parseInt(f.year) } })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); setModal(false); setForm(empty); },
  });

  const markPaid = useMutation({
    mutationFn: async (p: any) => (await api.payroll[":id"].$put({ param: { id: String(p.id) }, json: { ...p, status: "paid", paidDate: new Date().toISOString().slice(0, 10) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => (await api.payroll[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });

  const totalNet = payrollData?.payroll?.reduce((s: number, p: any) => s + (p.netSalary || 0), 0) || 0;
  const paidCount = payrollData?.payroll?.filter((p: any) => p.status === "paid").length || 0;
  const pendingCount = payrollData?.payroll?.filter((p: any) => p.status === "pending").length || 0;

  const getStaffName = (id: number) => staffData?.staff?.find((s: any) => s.id === id)?.name || `Staff #${id}`;

  return (
    <Layout title="Payroll" action={<Button onClick={() => setModal(true)}><Plus size={15} /> Generate Payroll</Button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Payroll" value={`KES ${totalNet.toLocaleString()}`} icon={<Wallet size={20} />} />
        <StatCard label="Paid" value={paidCount} icon={<Wallet size={20} />} color="#3FB950" />
        <StatCard label="Pending" value={pendingCount} icon={<Wallet size={20} />} color="#E3B341" />
      </div>

      <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Staff", "Month/Year", "Basic", "Allowances", "Deductions", "Net Salary", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</td></tr>
            ) : payrollData?.payroll?.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No payroll records yet</td></tr>
            ) : payrollData?.payroll?.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{getStaffName(p.staffId)}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{p.month} {p.year}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>KES {p.basicSalary?.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#3FB950" }}>+{p.allowances?.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--danger)" }}>-{p.deductions?.toLocaleString()}</td>
                <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>KES {p.netSalary?.toLocaleString()}</td>
                <td style={{ padding: "10px 14px" }}><Badge status={p.status} /></td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {p.status === "pending" && (
                      <Button size="sm" onClick={() => markPaid.mutate(p)} loading={markPaid.isPending}>Mark Paid</Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete payroll?")) remove.mutate(p.id); }}><Trash2 size={13} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate Payroll" width={520}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Staff Member" value={form.staffId} onChange={e => {
            const s = staffData?.staff?.find((m: any) => m.id === parseInt(e.target.value));
            setForm({ ...form, staffId: e.target.value, basicSalary: s?.salary ? String(s.salary) : form.basicSalary });
          }} options={(staffData?.staff || []).map((s: any) => ({ value: String(s.id), label: s.name }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
              options={months.map(m => ({ value: m, label: m }))} />
            <Input label="Year" type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
            <Input label="Basic Salary (KES)" type="number" value={form.basicSalary} onChange={e => setForm({ ...form, basicSalary: e.target.value })} required />
            <Input label="Allowances (KES)" type="number" value={form.allowances} onChange={e => setForm({ ...form, allowances: e.target.value })} />
            <Input label="Deductions (KES)" type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} />
          </div>
          <div style={{ padding: "12px", borderRadius: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Net Salary: </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
              KES {((parseFloat(form.basicSalary || "0") + parseFloat(form.allowances || "0") - parseFloat(form.deductions || "0"))).toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Generate</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
