import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, CalendarCheck,
  DollarSign, ClipboardList, Award, FileText, BarChart3,
  GraduationCap, LogOut, ChevronRight, Wallet
} from "lucide-react";
import { authClient } from "../lib/auth";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Students", icon: Users, path: "/students" },
  { label: "Staff", icon: UserCheck, path: "/staff" },
  { label: "Classes", icon: BookOpen, path: "/classes" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Fees & Payments", icon: DollarSign, path: "/fees" },
  { label: "Exams & Results", icon: ClipboardList, path: "/exams" },
  { label: "Payroll", icon: Wallet, path: "/payroll" },
  { label: "Certificates", icon: Award, path: "/certificates" },
  { label: "Accounts", icon: FileText, path: "/accounts" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/sign-in";
  };

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4ADE80, #22C55E)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <GraduationCap size={20} color="#0D1117" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.2 }}>Vineyard</div>
            <div style={{ fontWeight: 400, fontSize: 11, color: "var(--text-secondary)" }}>School Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <Link key={path} to={path}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                cursor: "pointer", transition: "all 0.15s",
                background: active ? "rgba(74,222,128,0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
                {active && <ChevronRight size={12} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 10px", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-secondary)" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
            {session?.user?.name || "Admin"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10 }}>
            {session?.user?.email}
          </div>
          <button onClick={handleSignOut} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--danger)", background: "none",
            border: "none", cursor: "pointer", padding: 0, fontFamily: "Poppins"
          }}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
