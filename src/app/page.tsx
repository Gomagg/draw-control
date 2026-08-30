"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Dices } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border flex items-center justify-center">
            <Dices className="w-5 h-5 text-violet" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">Draw Control</div>
            <div className="text-xs text-muted font-mono tracking-wider">LOTTERY MANAGEMENT PLATFORM</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-lg font-semibold mb-1">Sign in to your account</h1>
          <p className="text-sm text-muted mb-6">Access the lottery operations console.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red/10 border border-red/20 text-red text-sm">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10.5px] text-muted uppercase tracking-wider mb-1.5 font-semibold">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-teal transition"
                placeholder="admin@drawcontrol.com" required />
            </div>
            <div>
              <label className="block text-[10.5px] text-muted uppercase tracking-wider mb-1.5 font-semibold">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-teal transition"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-teal text-bg font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 text-sm">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 p-3 bg-bg border border-border rounded-lg text-xs text-muted font-mono leading-relaxed">
            <strong className="text-text">Demo credentials:</strong><br />
            Super Admin → super@drawcontrol.com / admin123<br />
            Agency Admin → agency@drawcontrol.com / admin123<br />
            Cashier → cashier@drawcontrol.com / admin123
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted font-mono">
          reference build · v1.0
        </div>
      </div>
    </div>
  );
}