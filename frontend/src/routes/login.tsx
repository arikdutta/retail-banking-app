import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function PhoneMockup() {
  return (
    <div className="relative flex items-center justify-center h-full py-8">
      {/* Decorative faded phone outlines */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-56 rounded-3xl border-2 border-white/25"
        style={{ transform: "translateY(-45%) translateX(20%)" }}
      />
      <div
        className="absolute right-10 top-1/2 w-24 h-44 rounded-3xl border-2 border-white/15"
        style={{ transform: "translateY(-38%) translateX(30%)" }}
      />

      {/* Main phone */}
      <div
        className="relative z-10 w-44 rounded-[2rem] shadow-2xl overflow-hidden bg-blue-950"
        style={{
          border: "3px solid oklch(0.15 0.04 265)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Status bar */}
        <div
          className="px-4 pt-2 pb-1 flex justify-between items-center text-white bg-blue-950"
        >
          <span className="text-[10px] font-medium">9:41</span>
          <div className="w-16 h-4 bg-black rounded-full mx-auto" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 border border-white/60 rounded-sm">
              <div className="w-2 h-full bg-white/60 rounded-sm" />
            </div>
          </div>
        </div>

        {/* App header */}
        <div className="bg-white px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold bg-primary"
            >
              R
            </div>
            <span className="text-[11px] font-bold text-gray-900">
              Rust Finance.
            </span>
          </div>
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full" />
          </div>
        </div>

        {/* Credit card */}
        <div className="bg-white px-3 pt-2 pb-3">
          <div
            className="rounded-xl p-3.5 bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400"
          >
            {/* Chip */}
            <div
              className="w-6 h-5 rounded mb-3"
              style={{
                background: "linear-gradient(135deg, #fde68a, #f59e0b)",
                opacity: 0.9,
              }}
            />
            {/* Card number dots */}
            <div className="flex gap-2 mb-2">
              {[0, 1, 2, 3].map((group) => (
                <div key={group} className="flex gap-0.5">
                  {[0, 1, 2, 3].map((dot) => (
                    <div
                      key={dot}
                      className="w-1 h-1 bg-white rounded-full"
                      style={{ opacity: 0.7 }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* Expiry row */}
            <div className="flex gap-0.5 mb-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-white rounded-full"
                  style={{ opacity: 0.6 }}
                />
              ))}
            </div>
            {/* VISA */}
            <div className="flex justify-end">
              <span className="text-white text-xs font-extrabold italic tracking-wider">
                VISA
              </span>
            </div>
          </div>
        </div>

        {/* App body rows */}
        <div className="bg-white px-3 pb-4 space-y-2">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-100 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div
                  className="h-1.5 bg-gray-200 rounded-full"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-1 bg-gray-100 rounded-full"
                  style={{ width: `${w - 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Invalid credentials");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      navigate({ to: "/" });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200"
    >
      <div
        className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ minHeight: "480px" }}
      >
        {/* Left – form panel */}
        <div className="w-5/12 bg-white px-10 py-10 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-primary"
            >
              R
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-gray-900">Rust Finance.</div>
              <div className="text-[11px] text-gray-400">Banking</div>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-0.5">
            Welcome Back!
          </h1>
          <p className="text-sm text-gray-400 mb-6">Login to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor={emailId} className="text-xs text-gray-500">
                Email
              </Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="root@example.com"
                className="rounded-lg border-gray-200 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={passwordId} className="text-xs text-gray-500">
                Password
              </Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border-gray-200 text-sm"
              />
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href="#"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="text-xs text-red-500 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-lg font-semibold bg-primary hover:bg-primary/90"
              size="lg"
            >
              {loading ? "Logging in…" : "Login"}
            </Button>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id={rememberId}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-indigo-600"
              />
              <label htmlFor={rememberId} className="text-xs text-gray-500 cursor-pointer">
                Remember me
              </label>
            </div>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Don't have an account?{" "}
            <a
              href="#"
              className="font-bold text-primary hover:underline"
            >
              Sign Up
            </a>
          </p>
        </div>

        {/* Right – decorative panel */}
        <div
          className="w-7/12 relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-blue-400"
        >
          <PhoneMockup />
        </div>
      </div>
    </div>
  );
}
