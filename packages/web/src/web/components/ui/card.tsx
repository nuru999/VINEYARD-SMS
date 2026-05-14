interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ children, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, margin: "0 0 6px" }}>{label}</p>
          <p style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 700, margin: 0 }}>{value}</p>
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: color ? `${color}20` : "rgba(74,222,128,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: color || "var(--accent)",
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
