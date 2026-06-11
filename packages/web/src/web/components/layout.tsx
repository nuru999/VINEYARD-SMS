import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Sidebar } from "./sidebar";
import { api } from "../lib/api";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/messages");
        const msgs: any[] = Array.isArray(res) ? res : [];
        return msgs.filter((m) => !m.read).length;
      } catch {
        return 0;
      }
    },
  });

  const count = data ?? 0;

  return (
    <div
      title="Messages"
      style={{
        position: "relative",
        cursor: "pointer",
        padding: "6px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748B",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onClick={() => (window.location.href = "/communication")}
    >
      <Bell size={20} />
      {count > 0 && (
        <span style={{
          position: "absolute",
          top: 2,
          right: 2,
          background: "#E91E8C",
          color: "#fff",
          borderRadius: "50%",
          fontSize: 10,
          fontWeight: 700,
          minWidth: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: "0 2px",
        }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </div>
  );
}

export function Layout({ children, title, action }: LayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>
        {title && (
          <div style={{
            padding: "16px 28px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFFFFF",
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 24, borderRadius: 2, background: "#E91E8C" }} />
              <h1 style={{
                margin: 0, fontSize: 19, fontWeight: 700, color: "#1E293B",
                fontFamily: "'Poppins', sans-serif",
              }}>{title}</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NotificationBell />
              {action && <div>{action}</div>}
            </div>
          </div>
        )}
        <div style={{ padding: "24px 28px", flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
