import { Sidebar } from "./sidebar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}

export function Layout({ children, title, action }: LayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>
        {title && (
          <div style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-primary)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h1>
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
