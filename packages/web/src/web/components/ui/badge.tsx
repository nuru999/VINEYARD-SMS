interface BadgeProps {
  status: string;
  children?: React.ReactNode;
}

const colors: Record<string, { bg: string; color: string }> = {
  active: { bg: "rgba(63,185,80,0.15)", color: "#3FB950" },
  inactive: { bg: "rgba(248,81,73,0.15)", color: "#F85149" },
  paid: { bg: "rgba(63,185,80,0.15)", color: "#3FB950" },
  pending: { bg: "rgba(227,179,65,0.15)", color: "#E3B341" },
  present: { bg: "rgba(63,185,80,0.15)", color: "#3FB950" },
  absent: { bg: "rgba(248,81,73,0.15)", color: "#F85149" },
  late: { bg: "rgba(227,179,65,0.15)", color: "#E3B341" },
  leave: { bg: "rgba(139,148,158,0.15)", color: "#64748B" },
  graduated: { bg: "rgba(74,222,128,0.15)", color: "#4ADE80" },
  transferred: { bg: "rgba(139,148,158,0.15)", color: "#64748B" },
  primary: { bg: "rgba(74,222,128,0.12)", color: "#4ADE80" },
  secondary: { bg: "rgba(88,166,255,0.12)", color: "#58A6FF" },
  income: { bg: "rgba(63,185,80,0.15)", color: "#3FB950" },
  expense: { bg: "rgba(248,81,73,0.15)", color: "#F85149" },
};

export function Badge({ status, children }: BadgeProps) {
  const s = status?.toLowerCase();
  const style = colors[s] || { bg: "rgba(139,148,158,0.15)", color: "#64748B" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, textTransform: "capitalize",
      background: style.bg, color: style.color,
    }}>
      {children || status}
    </span>
  );
}
