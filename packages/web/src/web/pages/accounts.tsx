import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { Printer } from "lucide-react";
import { Layout } from "../components/layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/modal";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const SCHOOL_NAME = "Vineyard Primary School";
const SCHOOL_MOTTO = "Fruitful Development";
const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  date: string;
  reference?: string;
  createdAt: string;
}

const INCOME_CATEGORIES = ["School Fees", "Donations", "Grants", "Other Income"];
const EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Supplies", "Maintenance", "Transport", "Events", "Other Expense"];
const PAYMENT_METHODS = ["Cash", "M-Pesa", "Bank Transfer"];

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
      .summary-box { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
      .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 20px; min-width: 140px; }
      .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
      .summary-value { font-size: 18px; font-weight: 700; }
      .total-row td { font-weight: 700; background: #f8fafc; }
      .income-badge { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
      .expense-badge { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { body { padding: 16px; } }
    </style>
  </head><body>${html}
    <div class="footer">Printed: ${new Date().toLocaleString("en-KE")} · ${SCHOOL_NAME}</div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

function printAccountsReport(transactions: Transaction[], summary: any, filter: any) {
  const filterDesc = [
    filter.type ? `Type: ${filter.type}` : "",
    filter.category ? `Category: ${filter.category}` : "",
    filter.startDate ? `From: ${filter.startDate}` : "",
    filter.endDate ? `To: ${filter.endDate}` : "",
  ].filter(Boolean).join(" · ");

  // Group by category
  const incomeRows = transactions.filter(t => t.type === "income");
  const expenseRows = transactions.filter(t => t.type === "expense");
  const totalIncome = incomeRows.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenseRows.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const makeRows = (list: Transaction[]) => list.map(t => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString("en-KE")}</td>
      <td><span class="${t.type}-badge">${t.type}</span></td>
      <td>${t.category}</td>
      <td>${t.description}</td>
      <td>${t.paymentMethod}</td>
      <td>${t.reference || "—"}</td>
      <td style="font-weight:600;color:${t.type === "income" ? "#065f46" : "#991b1b"}">${t.type === "income" ? "+" : "-"}${fmt(t.amount)}</td>
    </tr>`).join("");

  const html = `
    <div class="header">
      <div><div class="school-name">${SCHOOL_NAME}</div><div class="school-motto">${SCHOOL_MOTTO}</div></div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700">INCOME & EXPENSE REPORT</div>
        <div style="font-size:12px;color:#6b7280">${filterDesc || "All Transactions"}</div>
      </div>
    </div>
    <div class="summary-box">
      <div class="summary-card">
        <div class="summary-label">Total Income</div>
        <div class="summary-value" style="color:#065f46">${fmt(totalIncome)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Expenses</div>
        <div class="summary-value" style="color:#991b1b">${fmt(totalExpense)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Net Balance</div>
        <div class="summary-value" style="color:${balance >= 0 ? "#065f46" : "#991b1b"}">${fmt(balance)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Transactions</div>
        <div class="summary-value">${transactions.length}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Method</th><th>Reference</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${makeRows(transactions)}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="6"><strong>TOTALS</strong></td>
          <td style="color:${balance >= 0 ? "#065f46" : "#991b1b"}"><strong>${balance >= 0 ? "+" : ""}${fmt(balance)}</strong></td>
        </tr>
      </tfoot>
    </table>`;

  printHTML(html, "Income & Expense Report");
}

const accountsApi = {
  list: async (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    const r = await fetch(`/api/accounts${q}`, { credentials: "include" });
    if (!r.ok) return { transactions: [], summary: { totalIncome: 0, totalExpense: 0, balance: 0 } };
    return r.json();
  },
  create: async (data: Partial<Transaction>) => {
    const r = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed to create transaction");
    return r.json();
  },
  update: async ({ id, ...data }: Partial<Transaction> & { id: string }) => {
    const r = await fetch(`/api/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("Failed to update transaction");
    return r.json();
  },
  delete: async (id: string) => {
    const r = await fetch(`/api/accounts/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) throw new Error("Failed to delete transaction");
    return r.json();
  },
};

const empty: Partial<Transaction> = {
  type: "income",
  category: "",
  description: "",
  amount: 0,
  paymentMethod: "Cash",
  date: new Date().toISOString().split("T")[0],
  reference: "",
};

export default function AccountsPage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [filter, setFilter] = useState({ type: "", category: "", startDate: "", endDate: "" });
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>(empty);
  const [error, setError] = useState("");

  const params: Record<string, string> = {};
  if (filter.type) params.type = filter.type;
  if (filter.category) params.category = filter.category;
  if (filter.startDate) params.startDate = filter.startDate;
  if (filter.endDate) params.endDate = filter.endDate;

  const { data, isLoading } = useQuery({ queryKey: ["accounts", params], queryFn: () => accountsApi.list(params) });
  const transactions: Transaction[] = data?.transactions || [];
  const summary = data?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };

  const createMut = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); closeModal(); success("Transaction created"); },
    onError: (e: Error) => { setError(e.message); toastError("Create failed", e.message); },
  });
  const updateMut = useMutation({
    mutationFn: accountsApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); closeModal(); success("Transaction updated"); },
    onError: (e: Error) => { setError(e.message); toastError("Update failed", e.message); },
  });
  const deleteMut = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); closeModal(); success("Transaction deleted"); },
    onError: () => toastError("Delete failed"),
  });

  const openCreate = () => { setForm({ ...empty, date: new Date().toISOString().split("T")[0] }); setError(""); setModal("create"); };
  const openEdit = (t: Transaction) => { setSelected(t); setForm(t); setError(""); setModal("edit"); };
  const openDelete = (t: Transaction) => { setSelected(t); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); setForm(empty); setError(""); };

  const handleSubmit = () => {
    if (!form.category || !form.description || !form.amount || !form.date) {
      setError("Fill all required fields"); return;
    }
    if (modal === "create") createMut.mutate(form);
    else if (modal === "edit" && selected) updateMut.mutate({ ...form, id: selected.id });
  };

  const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

  return (
    <Layout>
      <div style={{ padding: "24px", maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Accounts</h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>Track income & expenses</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => printAccountsReport(transactions, summary, filter)}>
              <Printer size={14} /> Print Report
            </Button>
            <Button onClick={openCreate}>+ New Transaction</Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Income", value: summary.totalIncome, color: "#4ADE80" },
            { label: "Total Expenses", value: summary.totalExpense, color: "#F87171" },
            { label: "Balance", value: summary.balance, color: summary.balance >= 0 ? "#4ADE80" : "#F87171" },
          ].map((s) => (
            <Card key={s.label}>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{fmtCurrency(s.value)}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={filter.type}
              onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 14 }}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={filter.category}
              onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 14 }}
            >
              <option value="">All Categories</option>
              {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter((f) => ({ ...f, startDate: e.target.value }))}
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 14 }}
            />
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>to</span>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter((f) => ({ ...f, endDate: e.target.value }))}
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 14 }}
            />
            {(filter.type || filter.category || filter.startDate || filter.endDate) && (
              <button
                onClick={() => setFilter({ type: "", category: "", startDate: "", endDate: "" })}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div style={{ overflowX: "auto" }}>
            {isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>No transactions found</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Date", "Type", "Category", "Description", "Method", "Reference", "Amount", ""].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text-secondary)" }}>{new Date(t.date).toLocaleDateString("en-KE")}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant={t.type === "income" ? "success" : "danger"}>{t.type}</Badge>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 14 }}>{t.category}</td>
                      <td style={{ padding: "12px 16px", fontSize: 14, maxWidth: 200 }}>{t.description}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{t.paymentMethod}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>{t.reference || "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: t.type === "income" ? "#4ADE80" : "#F87171" }}>
                        {t.type === "expense" ? "-" : "+"}{fmtCurrency(t.amount)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(t)} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                          <button onClick={() => openDelete(t)} style={{ background: "transparent", border: "1px solid #F87171", color: "#F87171", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Create/Edit Modal */}
        <Modal isOpen={modal === "create" || modal === "edit"} onClose={closeModal} title={modal === "create" ? "New Transaction" : "Edit Transaction"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {error && <div style={{ background: "#F8717120", border: "1px solid #F87171", borderRadius: 6, padding: "10px 14px", color: "#F87171", fontSize: 14 }}>{error}</div>}
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Type *</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["income", "expense"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t as "income" | "expense", category: "" }))}
                    style={{ flex: 1, padding: "10px", borderRadius: 6, border: `1px solid ${form.type === t ? (t === "income" ? "#4ADE80" : "#F87171") : "var(--border)"}`, background: form.type === t ? (t === "income" ? "#4ADE8020" : "#F8717120") : "var(--bg-primary)", color: form.type === t ? (t === "income" ? "#4ADE80" : "#F87171") : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }}
              >
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Description *" value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. January fees collection" />
            <Input label="Amount (KES) *" type="number" value={form.amount?.toString() || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} placeholder="0" />
            <div>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                style={{ width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }}
              >
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Input label="Date *" type="date" value={form.date || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Reference (optional)" value={form.reference || ""} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. M-Pesa code, receipt no." />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={modal === "delete"} onClose={closeModal} title="Delete Transaction">
          <p style={{ color: "var(--text-secondary)", margin: "0 0 24px" }}>
            Delete <strong style={{ color: "var(--text-primary)" }}>{selected?.description}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={() => selected && deleteMut.mutate(selected.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
