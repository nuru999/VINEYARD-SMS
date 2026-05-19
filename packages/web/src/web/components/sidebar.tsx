import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, CalendarCheck,
  DollarSign, ClipboardList, Award, FileText, BarChart3,
  GraduationCap, LogOut, Wallet, Calendar, MessageSquare,
  Bus, Library, Package, ChevronDown, ChevronRight, ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { authClient } from "../lib/auth";
import { useRole } from "../lib/use-role";

// adminOnly: true = hidden from teachers
const navGroups = [
  {
    group: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Students", icon: Users, path: "/students" },
      { label: "Staff", icon: UserCheck, path: "/staff", adminOnly: true },
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
    adminOnly: true,
    items: [
      { label: "Fees & Payments", icon: DollarSign, path: "/fees", adminOnly: true },
      { label: "Payroll", icon: Wallet, path: "/payroll", adminOnly: true },
      { label: "Accounts", icon: FileText, path: "/accounts", adminOnly: true },
      { label: "Reports", icon: BarChart3, path: "/reports", adminOnly: true },
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
  const { isAdmin, isPrincipal, role } = useRole();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/sign-in";
  };

  const toggleGroup = (g: string) => setCollapsed(c => ({ ...c, [g]: !c[g] }));

  const roleLabel = isAdmin ? "Admin" : isPrincipal ? "Principal" : "Teacher";

  return (
    <aside style={{
      width: "240px",
      minHeight: "100vh",
      background: "var(--sidebar-bg)",
      borderRight: "none",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      zIndex: 50,
      overflowY: "auto",
      boxShadow: "2px 0 16px rgba(0,0,0,0.12)",
    }}>
      {/* Pink accent strip at top */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #E91E8C, #ff6ecb, #E91E8C)", flexShrink: 0 }} />

      {/* Logo / School Brand */}
      <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid var(--sidebar-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, flexShrink: 0 }}>
            <img src="/school-logo.png" alt="School Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700, fontSize: 16, color: "#FFFFFF", lineHeight: 1.2,
            }}>Vineyard Primary</div>
            <div style={{ fontWeight: 600, fontSize: 9, color: "#E91E8C", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Fruitful Development
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {navGroups.map(({ group, items, adminOnly: groupAdminOnly }) => {
          // Hide entire group if admin-only and user is teacher
          if (groupAdminOnly && !isAdmin) return null;

          // Filter items by role
          const visibleItems = items.filter(item => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group} style={{ marginBottom: 4 }}>
              <button onClick={() => toggleGroup(group)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "5px 20px", background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  fontFamily: "'Poppins', sans-serif",
                }}>
                {group}
                {collapsed[group] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
              {!collapsed[group] && visibleItems.map(({ label, icon: Icon, path }) => {
                const active = location === path;
                return (
                  <Link key={path} href={path} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 20px",
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.65)",
                    background: active ? "rgba(233,30,140,0.2)" : "transparent",
                    borderLeft: active ? "3px solid #E91E8C" : "3px solid transparent",
                    textDecoration: "none", fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    transition: "all 0.15s",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}>
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </div>
          );
        })}

        {/* Admin-only: User Management link */}
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              padding: "5px 20px",
              color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              fontFamily: "'Poppins', sans-serif",
            }}>Admin</div>
            <Link href="/user-management" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 20px",
              color: location === "/user-management" ? "#FFFFFF" : "rgba(255,255,255,0.65)",
              background: location === "/user-management" ? "rgba(233,30,140,0.2)" : "transparent",
              borderLeft: location === "/user-management" ? "3px solid #E91E8C" : "3px solid transparent",
              textDecoration: "none", fontSize: 13,
              fontWeight: location === "/user-management" ? 600 : 400,
              transition: "all 0.15s",
              fontFamily: "'Poppins', sans-serif",
            }}>
              <ShieldCheck size={15} />
              User Management
            </Link>
          </div>
        )}
      </nav>

      {/* User / Sign Out */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--sidebar-border)" }}>
        {session?.user && (
          <div style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: "#FFFFFF",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{session.user.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: isAdmin ? "#E91E8C" : isPrincipal ? "#60A5FA" : "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>
                ● {roleLabel}
              </span>
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{session.user.email}</div>
          </div>
        )}
        <button onClick={handleSignOut}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
            color: "rgba(255,255,255,0.75)", cursor: "pointer", fontSize: 13, fontWeight: 500,
            fontFamily: "'Poppins', sans-serif", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(233,30,140,0.2)";
            (e.currentTarget as HTMLElement).style.color = "#f9a8d4";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
          }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
