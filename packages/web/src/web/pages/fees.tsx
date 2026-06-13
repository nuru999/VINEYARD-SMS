import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";
import { Plus, Trash2, MessageCircle, CheckCircle, Printer, Download, FileSpreadsheet } from "lucide-react";
import { Layout } from "../components/layout";
import { exportExcel, exportCSV } from "../lib/export";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/ui/modal";
import { Input, Select } from "../components/ui/input";
import { Card, StatCard } from "../components/ui/card";
import { api } from "../lib/api";
import { DollarSign, TrendingDown, AlertCircle } from "lucide-react";

const SCHOOL_NAME = "Vineyard Primary School";
const SCHOOL_MOTTO = "Fruitful Development";

const emptyStructure = { name: "", amount: "", classId: "", frequency: "termly" };
const emptyPayment = { studentId: "", feeStructureId: "", amount: "", paidAmount: "", discount: "0", balance: "0", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "cash", term: "", notes: "" };

type Tab = "payments" | "defaulters" | "structures" | "summary";

const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Arial', sans-serif; color: #1a1a1a; background: #fff; padding: 32px; font-size: 13px; }
      h1 { font-size: 22px; font-weight: 800; color: #1B4D4D; }
      h2 { font-size: 15px; font-weight: 700; color: #1B4D4D; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #1B4D4D; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
      td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
      tr:last-child td { border-bottom: none; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #E91E8C; padding-bottom: 16px; margin-bottom: 20px; }
      .logo-box { width: 52px; height: 52px; background: #1B4D4D; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #E91E8C; font-size: 22px; font-weight: 900; }
      .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
      .paid { background: #dcfce7; color: #166534; }
      .owing { background: #fee2e2; color: #991b1b; }
      .total-row td { font-weight: 700; background: #f8fafc; }
      .footer { margin-top: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
      @media print { body { padding: 16px; } button { display: none !important; } }
    </style>
  </head><body>${html}
    <div class="footer">Printed on ${new Date().toLocaleString("en-KE")} · ${SCHOOL_NAME} · ${SCHOOL_MOTTO}</div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

export default function FeesPage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<Tab>("payments");
  const [structureModal, setStructureModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [sf, setSf] = useState<any>(emptyStructure);
  const [pf, setPf] = useState<any>(emptyPayment);
  const [filterClass, setFilterClass] = useState("");
  const [filterTerm, setFilterTerm] = useState("");

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j.payments) ? j.payments : Array.isArray(j) ? j : [];
    },
  });

  const { data: defaultersData, isLoading: defaultersLoading } = useQuery({
    queryKey: ["fee-defaulters"],
    queryFn: async () => {
      const r = await fetch("/api/fee-payments/defaulters", { credentials: "include" });
      if (!r.ok) return { defaulters: [], count: 0 };
      const j = await r.json();
      return { defaulters: Array.isArray(j.defaulters) ? j.defaulters : [], count: j.count || 0 };
    },
  });

  const { data: structuresData } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const r = await fetch("/api/fee-structures", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j.feeStructures) ? j.feeStructures : Array.isArray(j) ? j : [];
    },
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const r = await fetch("/api/students?limit=1000", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j.students) ? j.students : Array.isArray(j) ? j : [];
    },
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const r = await fetch("/api/classes", { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j.classes) ? j.classes : Array.isArray(j) ? j : [];
    },
  });

  const saveStructure = useMutation({
    mutationFn: async (f: any) => {
      const r = await fetch("/api/fee-structures", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, amount: parseFloat(f.amount), classId: f.classId ? parseInt(f.classId) : null }),
      });
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-structures"] }); setStructureModal(false); setSf(emptyStructure); success("Fee structure saved"); },
    onError: (e: any) => toastError("Save failed", e?.message),
  });

  const savePayment = useMutation({
    mutationFn: async (f: any) => {
      const amt = parseFloat(f.amount);
      const paid = parseFloat(f.paidAmount);
      const disc = parseFloat(f.discount || "0");
      const bal = amt - paid - disc;
      const r = await fetch("/api/fee-payments", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, studentId: parseInt(f.studentId), amount: amt, paidAmount: paid, discount: disc, balance: bal, feeStructureId: f.feeStructureId ? parseInt(f.feeStructureId) : null }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["fee-defaulters"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setPaymentModal(false); setPf(emptyPayment);
      success("Payment recorded");
    },
    onError: (e: any) => toastError("Payment failed", e?.message),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`/api/fee-payments/${id}`, { method: "DELETE", credentials: "include" });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["fee-defaulters"] });
      success("Payment deleted");
    },
    onError: () => toastError("Delete failed"),
  });

  const payments: any[] = Array.isArray(paymentsData) ? paymentsData : [];
  const structures: any[] = Array.isArray(structuresData) ? structuresData : [];
  const students: any[] = Array.isArray(studentsData) ? studentsData : [];
  const classes: any[] = Array.isArray(classesData) ? classesData : [];

  const getStudent = (id: number) => students.find(s => s.id === id);
  const getClass = (classId: number) => classes.find(c => c.id === classId);
  const getStructure = (id: number) => structures.find(s => s.id === id);

  const totalCollected = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalBalance = payments.reduce((s, p) => s + (p.balance || 0), 0);
  const defaulterCount = defaultersData?.count || 0;

  // Filtered payments for summary
  const filteredPayments = payments.filter(p => {
    const student = getStudent(p.studentId);
    if (filterClass && student?.classId !== parseInt(filterClass)) return false;
    if (filterTerm && p.term !== filterTerm) return false;
    return true;
  });

  // Class summary
  const classSummary = classes.map(cls => {
    const classStudents = students.filter(s => s.classId === cls.id);
    const classPayments = payments.filter(p => classStudents.some(s => s.id === p.studentId));
    return {
      class: cls,
      studentCount: classStudents.length,
      totalCollected: classPayments.reduce((s, p) => s + (p.paidAmount || 0), 0),
      totalOutstanding: classPayments.reduce((s, p) => s + (p.balance || 0), 0),
      paymentCount: classPayments.length,
    };
  }).filter(c => c.studentCount > 0);

  // ── Export fees to Excel / CSV
  const exportFeesExcel = () => {
    const rows = filteredPayments.map(p => {
      const student = getStudent(p.studentId);
      const cls = getClass(student?.classId);
      const structure = getStructure(p.feeStructureId);
      return {
        "Receipt No": p.receiptNo,
        "Student Name": student?.name || `#${p.studentId}`,
        "Admission No": student?.admissionNo || "",
        "Class": cls?.name || "",
        "Fee Type": structure?.name || "",
        "Total Amount (KES)": p.amount,
        "Paid (KES)": p.paidAmount,
        "Discount (KES)": p.discount,
        "Balance (KES)": p.balance,
        "Payment Method": p.paymentMethod,
        "Term": p.term || "",
        "Payment Date": p.paymentDate,
        "Notes": p.notes || "",
        "Parent Name": student?.parentName || "",
        "Parent Phone": student?.parentPhone || "",
      };
    });
    const label = filterTerm ? `_${filterTerm.replace(" ", "")}` : "";
    exportExcel(rows, `VineyardSMS_FeePayments${label}`, "Fee Payments");
  };

  const exportFeesCSV = () => {
    const rows = filteredPayments.map(p => {
      const student = getStudent(p.studentId);
      const cls = getClass(student?.classId);
      const structure = getStructure(p.feeStructureId);
      return {
        "Receipt No": p.receiptNo,
        "Student Name": student?.name || `#${p.studentId}`,
        "Admission No": student?.admissionNo || "",
        "Class": cls?.name || "",
        "Fee Type": structure?.name || "",
        "Total Amount (KES)": p.amount,
        "Paid (KES)": p.paidAmount,
        "Discount (KES)": p.discount,
        "Balance (KES)": p.balance,
        "Payment Method": p.paymentMethod,
        "Term": p.term || "",
        "Payment Date": p.paymentDate,
        "Notes": p.notes || "",
        "Parent Name": student?.parentName || "",
        "Parent Phone": student?.parentPhone || "",
      };
    });
    const label = filterTerm ? `_${filterTerm.replace(" ", "")}` : "";
    exportCSV(rows, `VineyardSMS_FeePayments${label}`);
  };

  // ── Print receipt for a single payment
  const printReceipt = (p: any) => {
    const student = getStudent(p.studentId);
    const structure = getStructure(p.feeStructureId);
    const cls = getClass(student?.classId);
    printHTML(`
      <div class="header">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="/school-logo.png" alt="Logo" style="width:60px;height:60px;object-fit:contain;border-radius:10px;background:#fff;padding:4px;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:10px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${SCHOOL_MOTTO}</div>
            <h1>${SCHOOL_NAME}</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Official Fee Receipt</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:800;color:#1B4D4D">${p.receiptNo}</div>
          <div style="font-size:12px;color:#64748b">${p.paymentDate}</div>
        </div>
      </div>
      <table style="margin-bottom:16px">
        <tr><td style="width:140px;color:#64748b;font-weight:600">Student Name</td><td style="font-weight:700">${student?.name || "—"}</td></tr>
        <tr><td style="color:#64748b;font-weight:600">Admission No.</td><td>${student?.admissionNo || "—"}</td></tr>
        <tr><td style="color:#64748b;font-weight:600">Class</td><td>${cls?.name || "—"}</td></tr>
        <tr><td style="color:#64748b;font-weight:600">Parent/Guardian</td><td>${student?.parentName || "—"}</td></tr>
        <tr><td style="color:#64748b;font-weight:600">Phone</td><td>${student?.parentPhone || "—"}</td></tr>
      </table>
      <table>
        <thead><tr><th>Description</th><th>Amount</th><th>Paid</th><th>Discount</th><th>Balance</th><th>Method</th>${p.term ? "<th>Term</th>" : ""}</tr></thead>
        <tbody>
          <tr>
            <td>${structure?.name || "Fee Payment"}</td>
            <td>${fmt(p.amount)}</td>
            <td style="color:#166534;font-weight:700">${fmt(p.paidAmount)}</td>
            <td>${fmt(p.discount)}</td>
            <td style="color:${p.balance > 0 ? "#991b1b" : "#166534"};font-weight:700">${fmt(p.balance)}</td>
            <td style="text-transform:capitalize">${p.paymentMethod}</td>
            ${p.term ? `<td>${p.term}</td>` : ""}
          </tr>
        </tbody>
      </table>
      ${p.notes ? `<div style="margin-top:16px;padding:10px 14px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b"><strong>Notes:</strong> ${p.notes}</div>` : ""}
      <div style="margin-top:24px;display:flex;justify-content:space-between;font-size:12px;color:#64748b">
        <span>Issued by: ___________________________</span>
        <span>Signature: ___________________________</span>
      </div>
    `, `Receipt ${p.receiptNo}`);
  };

  // ── Print all payments (filtered)
  const printPaymentsReport = () => {
    const rows = filteredPayments.map(p => {
      const student = getStudent(p.studentId);
      const cls = getClass(student?.classId);
      return `<tr>
        <td style="font-weight:600">${p.receiptNo}</td>
        <td>${student?.name || `#${p.studentId}`}</td>
        <td>${student?.admissionNo || "—"}</td>
        <td>${cls?.name || "—"}</td>
        <td>${p.paymentDate}</td>
        <td style="text-transform:capitalize">${p.paymentMethod}</td>
        <td>${p.term || "—"}</td>
        <td style="font-weight:600;color:#166534">${fmt(p.paidAmount)}</td>
        <td style="color:${p.balance > 0 ? "#991b1b" : "#166534"}">${fmt(p.balance)}</td>
      </tr>`;
    }).join("");

    printHTML(`
      <div class="header">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="/school-logo.png" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:10px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${SCHOOL_MOTTO}</div>
            <h1>${SCHOOL_NAME}</h1>
            <div style="font-size:12px;color:#64748b">Fee Payments Report${filterTerm ? ` — ${filterTerm}` : ""}${filterClass ? ` — ${classes.find(c=>c.id===parseInt(filterClass))?.name||""}` : ""}</div>
          </div>
        </div>
        <div style="text-align:right;font-size:12px;color:#64748b">
          <div>Total Records: <strong>${filteredPayments.length}</strong></div>
          <div>Total Collected: <strong style="color:#166534">${fmt(filteredPayments.reduce((s,p)=>s+p.paidAmount,0))}</strong></div>
          <div>Outstanding: <strong style="color:#991b1b">${fmt(filteredPayments.reduce((s,p)=>s+p.balance,0))}</strong></div>
        </div>
      </div>
      <table>
        <thead><tr><th>Receipt No</th><th>Student</th><th>Adm No.</th><th>Class</th><th>Date</th><th>Method</th><th>Term</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>${rows}</tbody>
        <tr class="total-row">
          <td colspan="7">TOTAL</td>
          <td>${fmt(filteredPayments.reduce((s,p)=>s+p.paidAmount,0))}</td>
          <td>${fmt(filteredPayments.reduce((s,p)=>s+p.balance,0))}</td>
        </tr>
      </table>
    `, "Fee Payments Report");
  };

  // ── Export defaulters
  const exportDefaultersExcel = () => {
    const defaulters = defaultersData?.defaulters || [];
    const rows = defaulters.map((d: any) => ({
      "Student Name": d.student?.name || "",
      "Admission No": d.student?.admissionNo || "",
      "Class": d.class?.name || "",
      "Parent Name": d.student?.parentName || "",
      "Parent Phone": d.student?.parentPhone || "",
      "Total Paid (KES)": d.totalPaid,
      "Outstanding (KES)": d.totalOwed,
    }));
    exportExcel(rows, "VineyardSMS_FeeDefaulters", "Defaulters");
  };

  // ── Print defaulters
  const printDefaulters = () => {
    const defaulters = defaultersData?.defaulters || [];
    const rows = defaulters.map((d: any) => `<tr>
      <td style="font-weight:600">${d.student?.name || "—"}</td>
      <td>${d.student?.admissionNo || "—"}</td>
      <td>${d.class?.name || "—"}</td>
      <td>${d.student?.parentName || "—"}</td>
      <td>${d.student?.parentPhone || "—"}</td>
      <td style="color:#166534;font-weight:600">${fmt(d.totalPaid)}</td>
      <td style="color:#991b1b;font-weight:700">${fmt(d.totalOwed)}</td>
    </tr>`).join("");
    const totalOwed = defaulters.reduce((s: number, d: any) => s + d.totalOwed, 0);

    printHTML(`
      <div class="header">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="/school-logo.png" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:10px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${SCHOOL_MOTTO}</div>
            <h1>${SCHOOL_NAME}</h1>
            <div style="font-size:12px;color:#64748b">Fee Defaulters Report</div>
          </div>
        </div>
        <div style="text-align:right;font-size:12px;color:#991b1b">
          <div><strong>${defaulters.length} students</strong> with outstanding fees</div>
          <div>Total Outstanding: <strong>${fmt(totalOwed)}</strong></div>
        </div>
      </div>
      <table>
        <thead><tr><th>Student</th><th>Adm No.</th><th>Class</th><th>Parent</th><th>Phone</th><th>Total Paid</th><th>Outstanding</th></tr></thead>
        <tbody>${rows}</tbody>
        <tr class="total-row"><td colspan="6">TOTAL OUTSTANDING</td><td style="color:#991b1b">${fmt(totalOwed)}</td></tr>
      </table>
    `, "Fee Defaulters Report");
  };

  // ── Export class summary
  const exportSummaryExcel = () => {
    const rows = classSummary.map(c => ({
      "Class": c.class.name,
      "Students": c.studentCount,
      "Transactions": c.paymentCount,
      "Total Collected (KES)": c.totalCollected,
      "Outstanding (KES)": c.totalOutstanding,
    }));
    exportExcel(rows, "VineyardSMS_FeeSummaryByClass", "Class Summary");
  };

  // ── Print class summary
  const printClassSummary = () => {
    const rows = classSummary.map(c => `<tr>
      <td style="font-weight:600">${c.class.name}</td>
      <td>${c.studentCount}</td>
      <td>${c.paymentCount}</td>
      <td style="color:#166534;font-weight:600">${fmt(c.totalCollected)}</td>
      <td style="color:${c.totalOutstanding > 0 ? "#991b1b" : "#166534"}">${fmt(c.totalOutstanding)}</td>
    </tr>`).join("");

    printHTML(`
      <div class="header">
        <div style="display:flex;align-items:center;gap:14px">
          <img src="/school-logo.png" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:10px;color:#E91E8C;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${SCHOOL_MOTTO}</div>
            <h1>${SCHOOL_NAME}</h1>
            <div style="font-size:12px;color:#64748b">Fee Summary by Class</div>
          </div>
        </div>
        <div style="text-align:right;font-size:12px">
          <div>Total Collected: <strong style="color:#166534">${fmt(totalCollected)}</strong></div>
          <div>Total Outstanding: <strong style="color:#991b1b">${fmt(totalBalance)}</strong></div>
        </div>
      </div>
      <table>
        <thead><tr><th>Class</th><th>Students</th><th>Transactions</th><th>Collected</th><th>Outstanding</th></tr></thead>
        <tbody>${rows}</tbody>
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${classSummary.reduce((s,c)=>s+c.studentCount,0)}</td>
          <td>${classSummary.reduce((s,c)=>s+c.paymentCount,0)}</td>
          <td style="color:#166534">${fmt(totalCollected)}</td>
          <td style="color:#991b1b">${fmt(totalBalance)}</td>
        </tr>
      </table>
    `, "Fee Summary by Class");
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "payments", label: "Payment Records" },
    { key: "defaulters", label: "Defaulters", count: defaulterCount },
    { key: "structures", label: "Fee Structures" },
    { key: "summary", label: "Class Summary" },
  ];

  const TERMS = ["Term 1", "Term 2", "Term 3"];

  return (
    <Layout title="Fees & Payments" action={
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setStructureModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
          <Plus size={14} /> Fee Structure
        </button>
        <button onClick={() => setPaymentModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#E91E8C", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff" }}>
          <Plus size={15} /> Record Payment
        </button>
      </div>
    }>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Total Collected</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#22C55E" }}>{fmt(totalCollected)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Outstanding</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#EF4444" }}>{fmt(totalBalance)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Transactions</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1E293B" }}>{payments.length}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Defaulters</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B" }}>{defaulterCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #E2E8F0" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 18px", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "#E91E8C" : "#64748B",
            borderBottom: tab === t.key ? "2px solid #E91E8C" : "2px solid transparent",
            marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: Payment Records */}
      {tab === "payments" && (
        <div>
          {/* Filters + Print */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", background: "#fff" }}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", background: "#fff" }}>
              <option value="">All Terms</option>
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button onClick={exportFeesCSV}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Download size={13} /> CSV
              </button>
              <button onClick={exportFeesExcel}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <FileSpreadsheet size={13} /> Excel
              </button>
              <button onClick={printPaymentsReport}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#1B4D4D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Receipt No", "Student", "Class", "Term", "Amount", "Paid", "Balance", "Method", "Date", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>Loading...</td></tr>
                ) : filteredPayments.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No payments recorded yet</td></tr>
                ) : filteredPayments.map((p: any) => {
                  const student = getStudent(p.studentId);
                  const cls = getClass(student?.classId);
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#E91E8C", fontWeight: 700 }}>{p.receiptNo}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{student?.name || `Student #${p.studentId}`}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{student?.admissionNo || ""}</div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{cls?.name || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{p.term || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#1E293B" }}>{fmt(p.amount)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{fmt(p.paidAmount)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: p.balance > 0 ? "#EF4444" : "#22C55E", fontWeight: p.balance > 0 ? 700 : 400 }}>{fmt(p.balance)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", padding: "3px 8px", borderRadius: 12, background: p.paymentMethod === "mpesa" ? "#dcfce7" : p.paymentMethod === "bank" ? "#dbeafe" : "#f3f4f6", color: p.paymentMethod === "mpesa" ? "#166534" : p.paymentMethod === "bank" ? "#1e40af" : "#374151" }}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748B" }}>{p.paymentDate}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => printReceipt(p)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#1D4ED8" }}>
                            <Printer size={11} /> Receipt
                          </button>
                          <button onClick={() => { if (confirm("Delete this payment record?")) deletePayment.mutate(p.id); }}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, fontSize: 11, cursor: "pointer", color: "#EF4444" }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filteredPayments.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                    <td colSpan={5} style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1E293B" }}>TOTALS ({filteredPayments.length} records)</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: "#22C55E" }}>{fmt(filteredPayments.reduce((s, p) => s + p.paidAmount, 0))}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: "#EF4444" }}>{fmt(filteredPayments.reduce((s, p) => s + p.balance, 0))}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB: Defaulters */}
      {tab === "defaulters" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            <button onClick={exportDefaultersExcel}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <FileSpreadsheet size={13} /> Export Excel
            </button>
            <button onClick={printDefaulters}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#1B4D4D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Printer size={14} /> Print List
            </button>
          </div>
          {defaultersLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Loading...</div>
          ) : defaultersData?.defaulters?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <CheckCircle size={48} style={{ marginBottom: 12, color: "#22C55E" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>All clear!</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>No fee defaulters.</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {["Student", "Adm No.", "Class", "Parent / Phone", "Total Paid", "Outstanding", "Action"].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {defaultersData.defaulters.map((d: any) => (
                    <tr key={d.student?.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{d.student?.name || "Unknown"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B" }}>{d.student?.admissionNo || "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B" }}>{d.class?.name || "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{d.student?.parentName || "—"}</div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>{d.student?.parentPhone || ""}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{fmt(d.totalPaid)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#EF4444", background: "#FEF2F2", padding: "3px 10px", borderRadius: 8 }}>{fmt(d.totalOwed)}</span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {d.student?.parentPhone ? (
                          <a href={`https://wa.me/${d.student.parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${d.student?.parentName || "Parent"}, your child ${d.student?.name} has an outstanding fee balance of KES ${d.totalOwed?.toLocaleString()} at ${SCHOOL_NAME}. Please settle at your earliest convenience. Thank you.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, textDecoration: "none" }}>
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: "#94A3B8" }}>No phone</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#FEF2F2", borderTop: "2px solid #FECACA" }}>
                    <td colSpan={6} style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
                      TOTAL OUTSTANDING — {defaulterCount} student{defaulterCount !== 1 ? "s" : ""}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 800, color: "#EF4444" }}>
                      {fmt(defaultersData.defaulters.reduce((s: number, d: any) => s + d.totalOwed, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Fee Structures */}
      {tab === "structures" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {structures.length === 0 ? (
            <div style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No fee structures yet. Click "Fee Structure" to add one.
            </div>
          ) : structures.map((fs: any) => (
            <div key={fs.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1B4D4D", marginBottom: 4 }}>{fs.name}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#E91E8C", marginBottom: 8 }}>{fmt(fs.amount)}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", padding: "3px 10px", borderRadius: 12, background: "#F0FDF4", color: "#166534" }}>{fs.frequency}</span>
                {fs.classId && <span style={{ fontSize: 11, color: "#64748B" }}>{classes.find(c => c.id === fs.classId)?.name || `Class #${fs.classId}`}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Class Summary */}
      {tab === "summary" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
            <button onClick={exportSummaryExcel}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <FileSpreadsheet size={13} /> Export Excel
            </button>
            <button onClick={printClassSummary}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#1B4D4D", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Printer size={14} /> Print Summary
            </button>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["Class", "Students", "Transactions", "Total Collected", "Outstanding"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classSummary.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>No data yet</td></tr>
                ) : classSummary.map(c => (
                  <tr key={c.class.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#1B4D4D" }}>{c.class.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#1E293B" }}>{c.studentCount}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748B" }}>{c.paymentCount}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#22C55E" }}>{fmt(c.totalCollected)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: c.totalOutstanding > 0 ? "#EF4444" : "#22C55E" }}>{fmt(c.totalOutstanding)}</td>
                  </tr>
                ))}
              </tbody>
              {classSummary.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#F8FAFC", borderTop: "2px solid #E2E8F0" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#1E293B" }}>TOTALS</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700 }}>{classSummary.reduce((s, c) => s + c.studentCount, 0)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700 }}>{classSummary.reduce((s, c) => s + c.paymentCount, 0)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: 800, color: "#22C55E" }}>{fmt(totalCollected)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: 800, color: "#EF4444" }}>{fmt(totalBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Fee Structure Modal */}
      <Modal open={structureModal} onClose={() => setStructureModal(false)} title="Add Fee Structure">
        <form onSubmit={e => { e.preventDefault(); saveStructure.mutate(sf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Fee Name" value={sf.name} onChange={e => setSf({ ...sf, name: e.target.value })} placeholder="e.g. Tuition Fee — Term 1" required />
          <Input label="Amount (KES)" type="number" value={sf.amount} onChange={e => setSf({ ...sf, amount: e.target.value })} required />
          <Select label="Class (optional — leave blank for all)" value={sf.classId} onChange={e => setSf({ ...sf, classId: e.target.value })}
            options={[{ value: "", label: "All Classes" }, ...classes.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
          <Select label="Frequency" value={sf.frequency} onChange={e => setSf({ ...sf, frequency: e.target.value })}
            options={[{ value: "termly", label: "Termly" }, { value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }, { value: "once", label: "One-time" }]} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setStructureModal(false)} style={{ padding: "9px 16px", background: "#F1F5F9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button type="submit" style={{ padding: "9px 18px", background: "#E91E8C", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add Structure</button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="Record Fee Payment" width={560}>
        <form onSubmit={e => { e.preventDefault(); savePayment.mutate(pf); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Student</label>
            <select value={pf.studentId} onChange={e => {
              const s = students.find(st => st.id === parseInt(e.target.value));
              const classStructures = structures.filter(fs => !fs.classId || fs.classId === s?.classId);
              setPf({ ...pf, studentId: e.target.value, feeStructureId: classStructures[0]?.id ? String(classStructures[0].id) : "", amount: classStructures[0]?.amount ? String(classStructures[0].amount) : pf.amount });
            }} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1E293B" }} required>
              <option value="">Select student...</option>
              {students.map(s => {
                const cls = getClass(s.classId);
                return <option key={s.id} value={s.id}>{s.name} ({s.admissionNo}) — {cls?.name || "No class"}</option>;
              })}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Fee Type</label>
            <select value={pf.feeStructureId} onChange={e => {
              const fs = structures.find(s => s.id === parseInt(e.target.value));
              setPf({ ...pf, feeStructureId: e.target.value, amount: fs?.amount ? String(fs.amount) : pf.amount });
            }} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1E293B" }}>
              <option value="">Select fee type...</option>
              {structures.map(fs => <option key={fs.id} value={fs.id}>{fs.name} — {fmt(fs.amount)}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Total Amount (KES)</label>
              <input type="number" value={pf.amount} onChange={e => setPf({ ...pf, amount: e.target.value })} required style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as any }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Amount Paid (KES)</label>
              <input type="number" value={pf.paidAmount} onChange={e => setPf({ ...pf, paidAmount: e.target.value })} required style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as any }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Discount (KES)</label>
              <input type="number" value={pf.discount} onChange={e => setPf({ ...pf, discount: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as any }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Payment Date</label>
              <input type="date" value={pf.paymentDate} onChange={e => setPf({ ...pf, paymentDate: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as any }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Payment Method</label>
              <select value={pf.paymentMethod} onChange={e => setPf({ ...pf, paymentMethod: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1E293B" }}>
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Term</label>
              <select value={pf.term} onChange={e => setPf({ ...pf, term: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, background: "#fff", color: "#1E293B" }}>
                <option value="">Select term...</option>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {/* Balance preview */}
          {pf.amount && pf.paidAmount && (
            <div style={{ padding: "12px 16px", borderRadius: 8, background: parseFloat(pf.amount) - parseFloat(pf.paidAmount) - parseFloat(pf.discount || "0") > 0 ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${parseFloat(pf.amount) - parseFloat(pf.paidAmount) - parseFloat(pf.discount || "0") > 0 ? "#FECACA" : "#BBF7D0"}` }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>Balance: </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: parseFloat(pf.amount) - parseFloat(pf.paidAmount) - parseFloat(pf.discount || "0") > 0 ? "#EF4444" : "#22C55E" }}>
                {fmt(parseFloat(pf.amount || "0") - parseFloat(pf.paidAmount || "0") - parseFloat(pf.discount || "0"))}
              </span>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Notes (optional)</label>
            <input value={pf.notes} onChange={e => setPf({ ...pf, notes: e.target.value })} placeholder="e.g. M-Pesa ref: QX123..." style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as any }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setPaymentModal(false)} style={{ padding: "9px 16px", background: "#F1F5F9", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button type="submit" style={{ padding: "9px 20px", background: "#E91E8C", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Record Payment</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
