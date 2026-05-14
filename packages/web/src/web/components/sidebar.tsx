import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, CalendarCheck,
  DollarSign, ClipboardList, Award, FileText, BarChart3,
  GraduationCap, LogOut, Wallet, Calendar, MessageSquare,
  Bus, Library, Package, ChevronDown, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { authClient } from "../lib/auth";

const navGroups = [
  {
    group: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Students", icon: Users, path: "/students" },
      { label: "Staff", icon: UserCheck, path: "/staff" },
      { label: "Classes", icon: BookOpen, path: "/classes" },
    ],
  },
  {
    group: "Academic",
    items: [
      { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
      { label: "Exams & Results", icon: ClipboardList, path: "/exams" },
      { label: "Timetable", icon: Calendar, path: "/timetable" },
      { label: "Report Cards", icon: FileText, path: "/report-cards" },
      { label: "Certificates", icon: Award, path: "/certificates" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Fees & Payments", icon: DollarSign, path: "/fees" },
      { label: "Payroll", icon: Wallet, path: "/payroll" },
      { label: "Accounts", icon: FileText, path: "/accounts" },
      { label: "Reports", icon: BarChart3, path: "/reports" },
    ],
  },
  {
    group: "School",
    items: [
      { label: "Communication", icon: MessageSquare, path: "/communication" },
      { label: "Transport", icon: Bus, path: "/transport" },
      { label: "Library", icon: Library, path: "/library" },
      { label: "Inventory", icon: Package, path: "/inventory" },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: session } = authClient.useSession();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/sign-in";
  };

  const toggleGroup = (g: string) => setCollapsed(c => ({ ...c, [g]: !c[g] }));

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      zIndex: 50,
      overflowY: "auto",
    }}>
      {/* Logo / School Brand */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #E91E8C, #1B4D4D)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#F0F6FC", lineHeight: 1.2 }}>Vineyard Primary</div>
            <div style={{ fontWeight: 400, fontSize: 10, color: "#E91E8C" }}>Fruitful Development</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {navGroups.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 4 }}>
            <button onClick={() => toggleGroup(group)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 20px", background: "none", border: "none", cursor: "pointer",
                color: "#8B949E", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {group}
              {collapsed[group] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!collapsed[group] && items.map(({ label, icon: Icon, path }) => {
              const active = location === path;
              return (
                <Link key={path} href={path}>
                  <a style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 20px",
                    color: active ? "#F0F6FC" : "#8B949E",
                    background: active ? "rgba(233,30,140,0.12)" : "transparent",
                    borderLeft: active ? "3px solid #E91E8C" : "3px solid transparent",
                    textDecoration: "none", fontSize: 13, fontWeight: active ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#F0F6FC"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "#8B949E"; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}>
                    <Icon size={15} />
                    {label}
                  </a>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / Sign Out */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        {session?.user && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F6FC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.name}</div>
            <div style={{ fontSize: 11, color: "#8B949E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.user.email}</div>
          </div>
        )}
        <button onClick={handleSignOut}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.2)", borderRadius: 8,
            color: "#F85149", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
