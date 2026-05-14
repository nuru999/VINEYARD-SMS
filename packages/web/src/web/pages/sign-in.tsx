import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { authClient } from "../lib/auth";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) { setError(res.error.message || "Invalid credentials"); setLoading(false); return; }
      setLocation("/");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* ── Left: Form Panel ── */}
      <div style={{
        flex: "0 0 480px",
        background: "#FFFFFF",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "48px 56px",
        position: "relative", zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{ width: "100%", maxWidth: 360, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, #E91E8C, #c0166d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(233,30,140,0.35)",
            }}>
              <GraduationCap size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22, fontWeight: 700, color: "#1B4D4D", lineHeight: 1.1 }}>
                Vineyard Primary
              </div>
              <div style={{ fontSize: 10, color: "#E91E8C", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Fruitful Development
              </div>
            </div>
          </div>

          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 700, color: "#1E293B" }}>
            Welcome back
          </h1>
          <p style={{ margin: "0 0 32px", fontSize: 14, color: "#64748B" }}>
            Sign in to manage your school
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@vineyard.school" required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                  border: "1.5px solid #E2E8F0", outline: "none", fontFamily: "'Poppins', sans-serif",
                  background: "#F8FAFC", color: "#1E293B", transition: "border 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "#E91E8C")}
                onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{
                    width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10, fontSize: 14,
                    border: "1.5px solid #E2E8F0", outline: "none", fontFamily: "'Poppins', sans-serif",
                    background: "#F8FAFC", color: "#1E293B", transition: "border 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#E91E8C")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#DC2626", fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: loading ? "#f472b6" : "linear-gradient(135deg, #E91E8C, #c0166d)",
                color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Poppins', sans-serif", letterSpacing: 0.3,
                boxShadow: "0 4px 16px rgba(233,30,140,0.35)",
                transition: "all 0.2s", marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 24 }}>
          © {new Date().getFullYear()} Vineyard Primary School · All rights reserved
        </p>
      </div>

      {/* ── Right: Classroom Hero Panel ── */}
      <div style={{
        flex: 1,
        background: "#1B4D4D",
        backgroundImage: `
          url("https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end",
        padding: "48px",
      }}>
        {/* overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(27,77,77,0.55) 0%, rgba(27,77,77,0.82) 60%, rgba(10,35,35,0.95) 100%)",
        }} />
        {/* Pink accent bar top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 5,
          background: "linear-gradient(90deg, #E91E8C, #ff6ecb, #E91E8C)",
        }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{
            display: "inline-block", background: "rgba(233,30,140,0.2)", border: "1px solid rgba(233,30,140,0.5)",
            borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "#f9a8d4",
            marginBottom: 16, letterSpacing: "0.05em",
          }}>
            School Management System
          </div>
          <h2 style={{
            margin: "0 0 14px",
            fontFamily: "'Dancing Script', cursive",
            fontSize: 46, fontWeight: 700, color: "#FFFFFF",
            lineHeight: 1.15, textShadow: "0 2px 16px rgba(0,0,0,0.3)",
          }}>
            Nurturing minds,<br />building futures
          </h2>
          <p style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, maxWidth: 420 }}>
            Manage students, staff, attendance, fees, exams and more — all from one powerful platform designed for Vineyard Primary School.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["Student Records", "Fee Management", "Attendance", "Exam Results", "Report Cards", "Staff Payroll"].map(f => (
              <span key={f} style={{
                fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 20, padding: "5px 14px",
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
