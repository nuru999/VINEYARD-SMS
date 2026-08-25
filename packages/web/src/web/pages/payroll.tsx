import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { Plus, Trash2, Wallet, Printer, FileText } from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { StatCard } from "../components/ui/card";
import { useRole } from "../lib/use-role";

const SCHOOL_NAME = "Vineyard Primary School";
const SCHOOL_MOTTO = "Fruitful Development";
const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }
  return payload as T;
}

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1B4D4D; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      .header { display: flex; justify-content: space-between; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 20px; }
      .school-name { font-size: 20px; font-weight: 700; color: #1B4D4D; }
      .school-motto { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .total-row td { font-weight: 700; background: #f8fafc; }
      .payslip-box { border: 2px solid #1B4D4D; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto; }
      .payslip-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .payslip-row.total { font-weight: 700; font-size: 15px; border-top: 2px solid #1B4D4D; border-bottom: none; margin-top: 8px; }
      .payslip-row.deduction { color: #dc2626; }
      .payslip-row.allowance { color: #16a34a; }
      .stamp { border: 3px solid #16a34a; color: #16a34a; padding: 6px 16px; border-radius: 4px; font-weight: 700; font-size: 16px; display: inline-block; transform: rotate(-5deg); margin-top: 12px; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { body { padding: 16px; } }
    </style>
  </head><body>${html}
    <div class="footer">Printed: ${new Date().toLocaleString("en-KE")} · ${SCHOOL_NAME}</div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

function printPayslip(p: any, staffName: string) {
  const net = (p.basicSalary || 0) + (p.allowances || 0) - (p.deductions || 0);
  const html = `
    <div class="header">
      <div><div class="school-name">${SCHOOL_NAME}</div><div class="school-motto">${SCHOOL_MOTTO}</div></div>
      <div style="text-align:right"><div style="font-size:18px;font-weight:700;color:#E91E8C">PAYSLIP</div><div style="font-size:12px;color:#6b7280">${p.month} ${p.year}</div></div>
    </div>
    <div class="payslip-box">
      <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb">
        <div style="font-size:16px;font-weight:700;color:#1B4D4D">${staffName}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">Pay Period: ${p.month} ${p.year} &nbsp;|&nbsp; Date Issued: ${new Date().toLocaleDateString("en-KE")}</div>
        ${p.paidDate ? `<div style="font-size:12px;color:#6b7280">Paid On: ${new Date(p.paidDate).toLocaleDateString("en-KE")}</div>` : ""}
      </div>
      <div class="payslip-row"><span>Basic Salary</span><span>${fmt(p.basicSalary)}</span></div>
      <div class="payslip-row allowance"><span>Allowances</span><span>+ ${fmt(p.allowances)}</span></div>
      <div class="payslip-row deduction"><span>Deductions</span><span>- ${fmt(p.deductions)}</span></div>
      <div class="payslip-row total"><span>NET SALARY</span><span>${fmt(net)}</span></div>
      ${p.status === "paid" ? `<div style="margin-top:16px"><span class="stamp">✓ PAID</span></div>` : ""}
    </div>
    <div style="margin-top:32px;display:flex;justify-content:space-between;font-size:12px;color:#6b7280">
      <div>_______________________<br/>Prepared By</div>
      <div>_______________________<br/>Head Teacher / Director</div>
    </div>`;
  printHTML(html, `Payslip - ${staffName} - ${p.month} ${p.year}`);
}

function printPayrollReport(payrollList: any[], staffList: any[], filterMonth: string, filterYear: string) {
  const filtered = payrollList.filter(p =>
    (!filterMonth || p.month === filterMonth) &&
    (!filterYear || String(p.year) === filterYear)
  );
  const totalBasic = filtered.reduce((s, p) => s + (p.basicSalary || 0), 0);
  const totalAllowances = filtered.reduce((s, p) => s + (p.allowances || 0), 0);
  const totalDeductions = filtered.reduce((s, p) => s + (p.deductions || 0), 0);
  const totalNet = filtered.reduce((s, p) => s + (p.netSalary || 0), 0);
  const paidCount = filtered.filter(p => p.status === "paid").length;

  const rows = filtered.map(p => {
    const name = staffList.find((s: any) => s.id === p.staffId)?.name || `Staff #${p.staffId}`;
    return `<tr>
      <td>${name}</td>
      <td>${p.month} ${p.year}</td>
      <td>${fmt(p.basicSalary)}</td>
      <td style="color:#16a34a">+${fmt(p.allowances)}</td>
      <td style="color:#dc2626">-${fmt(p.deductions)}</td>
      <td style="font-weight:600">${fmt(p.netSalary)}</td>
      <td><span style="padding:2px 8px;border-radius:10px;font-size:11px;background:${p.status === "paid" ? "#d1fae5" : "#fef3c7"};color:${p.status === "paid" ? "#065f46" : "#92400e"}">${p.status}</span></td>
    </tr>`;
  }).join("");

  const title = filterMonth ? `${filterMonth} ${filterYear || ""}` : "All Records";
  const html = `
    <div class="header">
      <div><div class="school-name">${SCHOOL_NAME}</div><div class="school-motto">${SCHOOL_MOTTO}</div></div>
      <div style="text-align:right"><div style="font-size:16px;font-weight:700">PAYROLL REPORT</div><div style="font-size:12px;color:#6b7280">${title}</div></div>
    </div>
    <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 20px;min-width:140px">
        <div style="font-size:11px;color:#6b7280">Total Payroll</div>
        <div style="font-size:18px;font-weight:700;color:#065f46">${fmt(totalNet)}</div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 20px;min-width:140px">
        <div style="font-size:11px;color:#6b7280">Staff Count</div>
        <div style="font-size:18px;font-weight:700;color:#065f46">${filtered.length}</div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 20px;min-width:140px">
        <div style="font-size:11px;color:#6b7280">Paid</div>
        <div style="font-size:18px;font-weight:700;color:#065f46">${paidCount} / ${filtered.length}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Staff Name</th><th>Period</th><th>Basic Salary</th><th>Allowances</th><th>Deductions</th><th>Net Salary</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="2"><strong>TOTALS</strong></td>
          <td>${fmt(totalBasic)}</td>
          <td style="color:#16a34a">+${fmt(totalAllowances)}</td>
          <td style="color:#dc2626">-${fmt(totalDeductions)}</td>
          <td>${fmt(totalNet)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
  printHTML(html, `Payroll Report - ${title}`);
}

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const empty = { staffId: "", month: months[new Date().getMonth()], year: new Date().getFullYear(), basicSalary: "", allowances: "0", deductions: "0", paidDate: "", status: "pending" };

export default function PayrollPage() {
  const qc = useQueryClient();
  const { role } = useRole();
  const canManage = role === "admin" || role === "accountant";
  const { success, error: toastError } = useToast();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const { data: payrollData, isLoading, error: payrollError } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => {
      const response = await fetch("/api/payroll", { credentials: "include" });
      const data = await parseResponse<any>(response, "Failed to load payroll");
      return data.payroll ?? data;
    },
  });

  const { data: staffData, error: staffError } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff", { credentials: "include" });
      const data = await parseResponse<any>(response, "Failed to load staff");
      return data.staff ?? data;
    },
  });

  const payrollList: any[] = Array.isArray(payrollData) ? payrollData : [];
  const staffList: any[] = Array.isArray(staffData) ? staffData : [];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(new Set([
    ...payrollList.map((p: any) => Number(p.year)).filter((year: number) => Number.isInteger(year)),
    ...Array.from({ length: 9 }, (_, index) => currentYear - 3 + index),
  ])).sort((a, b) => b - a);

  const filtered = payrollList.filter(p =>
    (!filterMonth || p.month === filterMonth) &&
    (!filterYear || String(p.year) === filterYear)
  );

  const save = useMutation({
    mutationFn: async (f: any) => {
      if (!canManage) throw new Error("Payroll changes require Admin or Accountant access");
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...f, staffId: parseInt(f.staffId), basicSalary: parseFloat(f.basicSalary), allowances: parseFloat(f.allowances || "0"), deductions: parseFloat(f.deductions || "0"), year: parseInt(f.year) }),
      });
      return parseResponse(response, "Failed to save payroll record");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); setModal(false); setForm(empty); success("Payroll record saved"); },
    onError: (e: Error) => toastError("Save failed", e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (p: any) => {
      if (!canManage) throw new Error("Payroll changes require Admin or Accountant access");
      const response = await fetch(`/api/payroll/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...p, status: "paid", paidDate: new Date().toISOString().slice(0, 10) }),
      });
      return parseResponse(response, "Failed to mark payroll as paid");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); success("Marked as paid"); },
    onError: (e: Error) => toastError("Failed to mark paid", e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      if (!canManage) throw new Error("Payroll changes require Admin or Accountant access");
      const response = await fetch(`/api/payroll/${id}`, { method: "DELETE", credentials: "include" });
      return parseResponse(response, "Failed to delete payroll record");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); success("Record deleted"); },
    onError: (e: Error) => toastError("Delete failed", e.message),
  });

  const totalNet = filtered.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
  const paidCount = filtered.filter((p: any) => p.status === "paid").length;
  const pendingCount = filtered.filter((p: any) => p.status === "pending").length;

  const getStaffName = (id: number) => staffList.find((s: any) => s.id === id)?.name || `Staff #${id}`;
  const loadError = payrollError || staffError;

  return (
    <Layout title="Payroll" action={
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" onClick={() => printPayrollReport(payrollList, staffList, filterMonth, filterYear)} disabled={Boolean(payrollError)}>
          <Printer size={14} /> Print Report
        </Button>
        {canManage && <Button onClick={() => setModal(true)} disabled={Boolean(staffError)}><Plus size={15} /> Generate Payroll</Button>}
      </div>
    }>
      {!canManage && !loadError && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8", fontSize: 12 }}>
          Principal finance oversight is read-only. Payroll creation, payment changes and deletion remain Admin/Accountant actions.
        </div>
      )}

      {loadError && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.08)", color: "var(--danger)", fontSize: 13 }}>
          {loadError instanceof Error ? loadError.message : "Payroll data could not be loaded. Refresh the page and try again."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Payroll" value={fmt(totalNet)} icon={<Wallet size={20} />} />
        <StatCard label="Paid" value={paidCount} icon={<Wallet size={20} />} color="#3FB950" />
        <StatCard label="Pending" value={pendingCount} icon={<Wallet size={20} />} color="#E3B341" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}
        >
          <option value="">All Years</option>
          {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        {(filterMonth || filterYear) && (
          <button onClick={() => { setFilterMonth(""); setFilterYear(""); }}
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 4 }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
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
            ) : payrollError ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--danger)", fontSize: 13 }}>Payroll records could not be loaded.</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No payroll records found</td></tr>
            ) : filtered.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{getStaffName(p.staffId)}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{p.month} {p.year}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(p.basicSalary)}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "#3FB950" }}>+{(p.allowances||0).toLocaleString("en-KE")}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--danger)" }}>-{(p.deductions||0).toLocaleString("en-KE")}</td>
                <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{fmt(p.netSalary)}</td>
                <td style={{ padding: "10px 14px" }}><Badge status={p.status} /></td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="secondary" size="sm" onClick={() => printPayslip(p, getStaffName(p.staffId))} title="Print Payslip">
                      <FileText size={13} />
                    </Button>
                    {canManage && p.status === "pending" && (
                      <Button size="sm" onClick={() => markPaid.mutate(p)} loading={markPaid.isPending}>Mark Paid</Button>
                    )}
                    {canManage && <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete payroll?")) remove.mutate(p.id); }}><Trash2 size={13} /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={canManage && modal} onClose={() => setModal(false)} title="Generate Payroll" width={520}>
        <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select label="Staff Member" value={form.staffId} onChange={e => {
            const s = staffList.find((m: any) => m.id === parseInt(e.target.value));
            setForm({ ...form, staffId: e.target.value, basicSalary: s?.salary ? String(s.salary) : form.basicSalary });
          }} options={(staffList || []).map((s: any) => ({ value: String(s.id), label: s.name }))} />
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
              {fmt((parseFloat(form.basicSalary || "0") + parseFloat(form.allowances || "0") - parseFloat(form.deductions || "0")))}
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
