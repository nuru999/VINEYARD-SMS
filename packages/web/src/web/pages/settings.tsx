import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout";
import { useRole } from "../lib/use-role";
import { Save, School, Calendar, Phone, Mail, MapPin, Image } from "lucide-react";

function Field({
  label, value, onChange, icon, type = "text", placeholder = "", disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  icon?: React.ReactNode; type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && (
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: "100%", padding: icon ? "10px 14px 10px 38px" : "10px 14px",
            borderRadius: 10, fontSize: 14, border: "1.5px solid #E2E8F0",
            background: disabled ? "#F8FAFC" : "#FFFFFF", color: "#1E293B",
            fontFamily: "inherit", outline: "none", transition: "border 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={e => { if (!disabled) e.target.style.borderColor = "#E91E8C"; }}
          onBlur={e => { e.target.style.borderColor = "#E2E8F0"; }}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0",
      padding: "20px 24px", marginBottom: 20,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #F1F5F9" }}>
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { role } = useRole();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, string> | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["school-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json() as Promise<Record<string, string>>;
    },
    onSuccess: (data) => {
      if (!form) setForm({ ...data });
    },
  } as any);

  const mutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["school-settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const isAdmin = role === "admin";
  const current = form ?? settings ?? {};
  const set = (key: string) => (v: string) => setForm(f => ({ ...(f ?? {}), ...current, [key]: v }));

  if (isLoading) {
    return (
      <Layout title="Settings">
        <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 800 }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B" }}>School Settings</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
              {isAdmin ? "Configure school information and academic calendar." : "View school configuration. Contact admin to make changes."}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => form && mutation.mutate(form)}
              disabled={mutation.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: saved ? "#22c55e" : "linear-gradient(135deg, #E91E8C, #c0166d)",
                color: "#fff", border: "none", cursor: "pointer",
                boxShadow: "0 2px 10px rgba(233,30,140,0.3)", transition: "all 0.2s",
              }}
            >
              <Save size={15} />
              {mutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>

        {/* School Identity */}
        <Section title="🏫 School Identity">
          <Field label="School Name" value={current.school_name ?? ""} onChange={set("school_name")} icon={<School size={14} />} placeholder="Vineyard Primary School" disabled={!isAdmin} />
          <Field label="School Motto" value={current.school_motto ?? ""} onChange={set("school_motto")} placeholder="Fruitful Development" disabled={!isAdmin} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Logo URL (paste an image link)" value={current.school_logo_url ?? ""} onChange={set("school_logo_url")} icon={<Image size={14} />} placeholder="https://..." disabled={!isAdmin} />
          </div>
          {current.school_logo_url && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={current.school_logo_url}
                alt="School Logo"
                style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", padding: 6 }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span style={{ fontSize: 12, color: "#64748B" }}>Logo preview</span>
            </div>
          )}
        </Section>

        {/* Academic Calendar */}
        <Section title="📅 Academic Calendar">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Current Term
            </label>
            <select
              value={current.current_term ?? "Term 1"}
              onChange={e => set("current_term")(e.target.value)}
              disabled={!isAdmin}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14,
                border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#1E293B",
                fontFamily: "inherit", outline: "none", cursor: isAdmin ? "pointer" : "not-allowed",
              }}
            >
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
              Academic Year
            </label>
            <select
              value={current.current_year ?? String(new Date().getFullYear())}
              onChange={e => set("current_year")(e.target.value)}
              disabled={!isAdmin}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14,
                border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#1E293B",
                fontFamily: "inherit", outline: "none", cursor: isAdmin ? "pointer" : "not-allowed",
              }}
            >
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Contact Info */}
        <Section title="📞 Contact Information">
          <Field label="School Email" value={current.school_email ?? ""} onChange={set("school_email")} icon={<Mail size={14} />} type="email" placeholder="info@vineyard.school" disabled={!isAdmin} />
          <Field label="Phone Number" value={current.school_phone ?? ""} onChange={set("school_phone")} icon={<Phone size={14} />} placeholder="+254 700 000 000" disabled={!isAdmin} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="School Address" value={current.school_address ?? ""} onChange={set("school_address")} icon={<MapPin size={14} />} placeholder="P.O Box 1234, Nairobi, Kenya" disabled={!isAdmin} />
          </div>
        </Section>

        {!isAdmin && (
          <div style={{ padding: "12px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, fontSize: 13, color: "#92400E" }}>
            You have read-only access to settings. Only admins can make changes.
          </div>
        )}
      </div>
    </Layout>
  );
}
