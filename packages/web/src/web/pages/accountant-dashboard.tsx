import { useQuery } from "@tanstack/react-query";
import accountantPic from "../assets/accountant-pic.jpg";
import { Layout } from "../components/layout";
import { useRole } from "../lib/use-role";
import { Link } from "wouter";
import { DollarSign, Wallet, FileText, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

function StatCard({ label, value, icon, color = "#34D399" }: { label: string; value: any; icon: React.ReactNode; color?: string }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
      padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B", lineHeight: 1.1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function QuickLink({ label, icon, path, color = "#34D399" }: { label: string; icon: React.ReactNode; path: string; color?: string }) {
  return (
    <Link href={path} style={{ textDecoration: "none" }}>
      <div style={{
        background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0",
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = color; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{label}</span>
      </div>
    </Link>
  );
}

const fmt = (n: number) => `KES ${(n || 0).toLocaleString("en-KE")}`;

export default function AccountantDashboard() {
  const { user } = useRole();
  const fullDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const { data: feesData } = useQuery({
    queryKey: ["fees-summary"],
    queryFn: async () => {
      const res = await fetch("/api/fees", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: payrollData } = useQuery({
    queryKey: ["payroll-summary"],
    queryFn: async () => {
      const res = await fetch("/api/payroll", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts-summary"],
    queryFn: async () => {
      const res = await fetch("/api/accounts", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const payments = (feesData as any)?.payments ?? [];
  const totalCollected = payments.reduce((s: number, p: any) => s + (p.amountPaid ?? 0), 0);
  const totalBalance = payments.reduce((s: number, p: any) => s + (p.balance ?? 0), 0);

  const payrollList = (payrollData as any)?.payroll ?? [];
  const totalPayroll = payrollList
    .filter((p: any) => p.status === "paid")
    .reduce((s: number, p: any) => s + (p.netPay ?? 0), 0);

  const transactions = (accountsData as any)?.transactions ?? [];
  const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
  const totalExpense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + (t.amount ?? 0), 0);

  return (
    <Layout title="Accountant Dashboard">
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #065f46, #047857)",
        borderRadius: 16, padding: "20px 24px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        position: "relative", overflow: "hidden",
      }}>
        {/* School photo */}
        <img src={accountantPic} alt="School" style={{
          position: "absolute", top: 0, right: 0, height: "100%", width: 260,
          objectFit: "cover", objectPosition: "center", opacity: 0.22,
          borderRadius: "0 16px 16px 0",
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 280,
          background: "linear-gradient(to right, #065f46 0%, transparent 100%)",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 }}>{fullDate}</div>
          <div style={{ color: "#FFFFFF", fontSize: 20, fontWeight: 700 }}>
            Welcome, {user?.name?.split(" ")[0] ?? "Accountant"} 👋
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 }}>
            Finance & Accounts — Vineyard Primary School
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 18px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 18 }}>{fmt(totalIncome - totalExpense)}</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Net Balance</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Fees Collected" value={fmt(totalCollected)} icon={<DollarSign size={20} />} color="#34D399" />
        <StatCard label="Outstanding Balance" value={fmt(totalBalance)} icon={<TrendingDown size={20} />} color="#F87171" />
        <StatCard label="Payroll Paid" value={fmt(totalPayroll)} icon={<Wallet size={20} />} color="#60A5FA" />
        <StatCard label="Total Income" value={fmt(totalIncome)} icon={<TrendingUp size={20} />} color="#A78BFA" />
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>Quick Access</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <QuickLink label="Fees & Payments" icon={<DollarSign size={16} />} path="/fees" color="#34D399" />
          <QuickLink label="Payroll" icon={<Wallet size={16} />} path="/payroll" color="#60A5FA" />
          <QuickLink label="Accounts" icon={<FileText size={16} />} path="/accounts" color="#F59E0B" />
          <QuickLink label="Reports" icon={<BarChart3 size={16} />} path="/reports" color="#A78BFA" />
        </div>
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Recent Transactions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {transactions.slice(0, 5).map((t: any) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid #F1F5F9" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{t.description || t.category}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{t.category} · {t.date?.slice(0, 10)}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.type === "income" ? "#10B981" : "#EF4444" }}>
                  {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
