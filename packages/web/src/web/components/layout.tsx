import { Sidebar } from "./sidebar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
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
            {action && <div>{action}</div>}
          </div>
        )}
        <div style={{ padding: "24px 28px", flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
