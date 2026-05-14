import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap } from "lucide-react";
import { authClient } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        const res = await authClient.signUp.email({ name, email, password });
        if (res.error) { setError(res.error.message || "Sign up failed"); setLoading(false); return; }
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) { setError(res.error.message || "Invalid credentials"); setLoading(false); return; }
      }
      setLocation("/");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-primary)",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(74,222,128,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(74,222,128,0.04) 0%, transparent 60%)",
    }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #4ADE80, #22C55E)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 0 32px rgba(74,222,128,0.3)",
          }}>
            <GraduationCap size={28} color="#0D1117" />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Vineyard School</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>School Management System</p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-secondary)", borderRadius: 16,
          border: "1px solid var(--border)", padding: "32px 28px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
        }}>
          <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isSignUp && (
              <Input label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
            )}
            <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@vineyard.school" required />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", fontSize: 12, color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <Button type="submit" loading={loading} style={{ marginTop: 4 }}>
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>
            {isSignUp ? "Already have an account? " : "Need an account? "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={{
              color: "var(--accent)", background: "none", border: "none",
              cursor: "pointer", fontFamily: "Poppins", fontSize: 12, fontWeight: 600
            }}>
              {isSignUp ? "Sign In" : "Register"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--text-secondary)" }}>
          © 2025 Vineyard School. All rights reserved.
        </p>
      </div>
    </div>
  );
}
