import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Layout } from "../components/layout";
import { useToast } from "../components/ui/toast";
import { useRole } from "../lib/use-role";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "admin" | "principal" | "teacher" | "accountant" | "unconfigured";
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error((data as any)?.message || "Request failed");
  return data;
}

export default function AdminSecurityPage() {
  const { user } = useRole();
  const { success, error: showError } = useToast();
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data, isLoading, isError, error } = useQuery<{ users: UserRecord[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => parseResponse(await fetch("/api/me/users", { credentials: "include" })),
  });

  const users = useMemo(
    () => (data?.users ?? []).filter((candidate) => candidate.id !== user?.id),
    [data?.users, user?.id],
  );
  const target = users.find((candidate) => candidate.id === targetId) ?? null;

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error("Choose a user");
      if (newPassword.length < 12) throw new Error("Password must be at least 12 characters");
      if (newPassword.length > 128) throw new Error("Password cannot exceed 128 characters");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");

      return parseResponse(await fetch(`/api/admin-security/users/${targetId}/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      }));
    },
    onSuccess: () => {
      success("Password reset; all sessions for that account were revoked");
      setNewPassword("");
      setConfirmPassword("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (mutationError: any) => showError("Password reset failed", mutationError?.message),
  });

  return (
    <Layout title="Admin Security">
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <ShieldCheck size={20} color="#E91E8C" />
            <h2 style={{ margin: 0, fontSize: 18, color: "#1E293B" }}>Account password recovery</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#64748B" }}>
            Admins can reset another user's email/password credential without knowing the old password. A successful reset immediately revokes every active session for that account.
          </p>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
          {isLoading ? (
            <div style={{ fontSize: 13, color: "#64748B" }}>Loading users...</div>
          ) : isError ? (
            <div style={{ fontSize: 13, color: "#DC2626" }}>{error instanceof Error ? error.message : "Could not load users"}</div>
          ) : (
            <form
              onSubmit={(event) => { event.preventDefault(); resetMutation.mutate(); }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>Account</label>
                <select
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#fff", fontSize: 13 }}
                >
                  <option value="">Select an account...</option>
                  {users.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} — {candidate.role} — {candidate.email}
                    </option>
                  ))}
                </select>
              </div>

              {target && (
                <div style={{ padding: 12, borderRadius: 8, background: "#FFF7ED", border: "1px solid #FED7AA", fontSize: 12, color: "#9A3412" }}>
                  Resetting <strong>{target.name}</strong> will sign that account out on every device. Share the new password privately and require the user to change it again from My Profile.
                </div>
              )}

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>New temporary password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#374151" }}>Confirm temporary password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <button
                type="submit"
                disabled={resetMutation.isPending || !targetId || newPassword.length < 12 || newPassword !== confirmPassword}
                style={{
                  alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 18px", border: "none", borderRadius: 8,
                  background: "#E91E8C", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: resetMutation.isPending ? "not-allowed" : "pointer",
                  opacity: resetMutation.isPending || !targetId || newPassword.length < 12 || newPassword !== confirmPassword ? 0.55 : 1,
                }}
              >
                <KeyRound size={15} /> {resetMutation.isPending ? "Resetting..." : "Reset password & revoke sessions"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
