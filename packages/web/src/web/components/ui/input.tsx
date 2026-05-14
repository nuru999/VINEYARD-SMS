interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>}
      <input
        {...props}
        style={{
          background: "var(--bg-primary)", border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)",
          fontSize: 13, fontFamily: "Poppins", outline: "none", width: "100%",
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? "var(--danger)" : "var(--border)"; }}
      />
      {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</label>}
      <select
        {...props}
        style={{
          background: "var(--bg-primary)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)",
          fontSize: 13, fontFamily: "Poppins", outline: "none", width: "100%",
          ...style,
        }}
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
