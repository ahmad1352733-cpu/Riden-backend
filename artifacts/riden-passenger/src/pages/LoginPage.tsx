import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("riden_token", data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err?.response?.data?.error || "Invalid credentials",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-full bg-[#F5A623] flex items-center justify-center mb-4 shadow-lg">
            <span className="text-4xl font-black text-[#0F1B2D]">R</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-widest">RIDEN</h1>
          <p className="text-[#F5A623] text-sm mt-1 tracking-wider">YOUR RIDE, YOUR WAY</p>
        </div>

        {/* Card */}
        <div className="bg-[#1A2D44] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6">Welcome back</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[#F5A623] text-[#0F1B2D] font-bold py-3 rounded-xl hover:bg-[#e8961a] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{" "}
            <button
              onClick={() => setLocation("/register")}
              className="text-[#F5A623] font-semibold hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
