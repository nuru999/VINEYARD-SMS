import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: { bg: "#F0FDF4", border: "#BBF7D0", icon: "#16A34A", bar: "#22C55E" },
  error:   { bg: "#FEF2F2", border: "#FECACA", icon: "#DC2626", bar: "#EF4444" },
  warning: { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706", bar: "#F59E0B" },
  info:    { bg: "#EFF6FF", border: "#BFDBFE", icon: "#2563EB", bar: "#3B82F6" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const c = COLORS[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      maxWidth: 360,
      position: "relative",
      overflow: "hidden",
      transform: visible ? "translateX(0)" : "translateX(110%)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
    }}>
      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0,
        height: 3,
        background: c.bar,
        borderRadius: "0 0 0 12px",
        animation: "toast-progress 4s linear forwards",
      }} />

      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", fontFamily: "'Poppins', sans-serif" }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0, flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(t => [...t.slice(-4), { id, type, title, message }]);
  }, []);

  const ctx: ToastContextValue = {
    toast,
    success: (t, m) => toast("success", t, m),
    error: (t, m) => toast("error", t, m),
    warning: (t, m) => toast("warning", t, m),
    info: (t, m) => toast("info", t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div style={{
        position: "fixed",
        bottom: 24, right: 24,
        display: "flex", flexDirection: "column", gap: 10,
        zIndex: 9999,
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "all" }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
