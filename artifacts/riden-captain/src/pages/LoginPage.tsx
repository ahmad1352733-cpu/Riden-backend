import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("riden_token", data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || err?.message || "Login failed");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F1B2D] px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-white tracking-tight">RIDEN</h1>
          <p className="text-[#22C55E] text-lg font-semibold mt-1 tracking-widest uppercase">Captain</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="captain@example.com"
              className="w-full bg-[#1A2D44] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] placeholder-gray-600 transition"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#1A2D44] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] placeholder-gray-600 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          New captain?{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setLocation("/register"); }}
            className="text-[#22C55E] hover:text-[#16a34a] font-medium transition"
          >
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
