interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, children, style, disabled, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    borderRadius: 8, fontFamily: "Poppins", fontWeight: 600,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    border: "none", transition: "all 0.15s", outline: "none",
    opacity: disabled || loading ? 0.6 : 1,
    padding: size === "sm" ? "6px 12px" : "9px 18px",
    fontSize: size === "sm" ? 12 : 13,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--accent)", color: "#0D1117" },
    secondary: { background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" },
    danger: { background: "rgba(248,81,73,0.15)", color: "var(--danger)", border: "1px solid rgba(248,81,73,0.3)" },
    ghost: { background: "transparent", color: "var(--text-secondary)" },
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {loading && (
        <span style={{
          width: 12, height: 12, border: "2px solid currentColor",
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.6s linear infinite", display: "inline-block",
        }} />
      )}
      {children}
    </button>
  );
}
