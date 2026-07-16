import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterPassenger } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  const registerMutation = useRegisterPassenger({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("riden_token", data.token);
        setLocation("/");
      },
      onError: (err: any) => {
        toast({
          title: "Registration failed",
          description: err?.response?.data?.error || "Something went wrong",
          variant: "destructive",
        });
      },
    },
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: form });
  };

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#F5A623] flex items-center justify-center mb-3 shadow-lg">
            <span className="text-3xl font-black text-[#0F1B2D]">R</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-widest">RIDEN</h1>
          <p className="text-[#F5A623] text-xs mt-1 tracking-wider">YOUR RIDE, YOUR WAY</p>
        </div>

        {/* Card */}
        <div className="bg-[#1A2D44] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-bold mb-6">Create account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Ahmad Al-Rashid"
                required
                minLength={2}
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="+962791234567"
                required
                minLength={9}
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="you@example.com"
                required
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-[#F5A623] text-[#0F1B2D] font-bold py-3 rounded-xl hover:bg-[#e8961a] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-[#F5A623] font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
