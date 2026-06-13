import { useState } from "react";
import { Layout } from "../components/layout";
import { useRole } from "../lib/use-role";
import { authClient } from "../lib/auth";
import { useToast } from "../components/ui/toast";
import { useQuery } from "@tanstack/react-query";
import { UserCircle, Mail, Phone, BookOpen, Shield, Key } from "lucide-react";

export default function ProfilePage() {
  const { user, role } = useRole();
  const { data: session } = authClient.useSession();
  const { success, error: showError } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Load profile for phone
  const { data: profileData } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const r = await fetch("/api/me", { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
  });

  // Load assigned class info for teachers
  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await fetch("/api/classes", { credentials: "include" });
      if (!res.ok) return [];
      const r = await res.json();
      return Array.isArray(r) ? r : (r.classes ?? []);
    },
    enabled: role === "teacher",
  });

  const myClasses = role === "teacher"
    ? (classesData ?? []).filter((c: any) => c.teacherUserId === user?.id)
    : [];

  const roleMeta: Record<string, { label: string; color: string; bg: string }> = {
    admin:      { label: "Admin",      color: "#E91E8C", bg: "#FDF2F8" },
    principal:  { label: "Principal",  color: "#3B82F6", bg: "#EFF6FF" },
    teacher:    { label: "Teacher",    color: "#10B981", bg: "#ECFDF5" },
    accountant: { label: "Accountant", color: "#F59E0B", bg: "#FFFBEB" },
  };
  const rm = roleMeta[role ?? "teacher"] ?? roleMeta.teacher;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showError("Passwords don't match"); return; }
    if (newPassword.length < 8) { showError("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if ((res as any)?.error) {
        showError((res as any).error.message ?? "Failed to change password");
      } else {
        success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <Layout title="My Profile">
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Profile card */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          {/* Banner */}
          <div style={{ height: 80, background: "linear-gradient(135deg, #1B4D4D, #0f2e2e)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(233,30,140,0.3), transparent)" }} />
          </div>

          {/* Avatar + info */}
          <div style={{ padding: "0 28px 24px", position: "relative" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #E91E8C, #c0166d)",
              border: "4px solid #FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: -36, marginBottom: 12,
              fontSize: 28, fontWeight: 800, color: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(233,30,140,0.3)",
            }}>
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1E293B" }}>{user?.name ?? "—"}</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{user?.email}</div>
              </div>
              <span style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                color: rm.color, background: rm.bg, border: `1px solid ${rm.color}30`,
              }}>
                ● {rm.label}
              </span>
            </div>

            {/* Info rows */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#475569" }}>
                <Mail size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                {user?.email}
              </div>
              {profileData?.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#475569" }}>
                  <Phone size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                  {profileData.phone}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#475569" }}>
                <Shield size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                {rm.label} — Vineyard Primary School
              </div>
              {myClasses.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#475569" }}>
                  <BookOpen size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                  Assigned: {myClasses.map((c: any) => c.name).join(", ")}
                </div>
              )}
              {role === "teacher" && myClasses.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#94A3B8" }}>
                  <BookOpen size={15} style={{ flexShrink: 0 }} />
                  No class assigned yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Key size={16} style={{ color: "#E91E8C" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Change Password</span>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Current Password", value: currentPassword, set: setCurrentPassword },
              { label: "New Password", value: newPassword, set: setNewPassword },
              { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
                <input
                  type="password" value={value} onChange={e => set(e.target.value)} required
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                    border: "1.5px solid #E2E8F0", outline: "none", fontFamily: "inherit",
                    background: "#F8FAFC", color: "#1E293B", transition: "border 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#E91E8C")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            ))}

            <button type="submit" disabled={changingPw} style={{
              padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: changingPw ? "#f472b6" : "linear-gradient(135deg, #E91E8C, #c0166d)",
              color: "#fff", border: "none", cursor: changingPw ? "not-allowed" : "pointer",
              alignSelf: "flex-start", marginTop: 4,
            }}>
              {changingPw ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </Layout>
  );
}
