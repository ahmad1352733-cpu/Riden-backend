import { useState } from "react";
import { useLocation } from "wouter";
import { useRegisterCaptain } from "@workspace/api-client-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    licenseNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleYear: "",
    vehicleColor: "",
  });

  const registerMutation = useRegisterCaptain({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem("riden_token", data.token);
        setPending(true);
        setTimeout(() => setLocation("/"), 3000);
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || err?.message || "Registration failed");
      },
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    registerMutation.mutate({
      data: {
        ...form,
        vehicleYear: parseInt(form.vehicleYear, 10),
      },
    });
  };

  if (pending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F1B2D] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-3">Registration Submitted!</h2>
          <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 rounded-xl px-4 py-4 text-sm">
            <p className="font-semibold mb-1">Awaiting Admin Approval</p>
            <p className="text-yellow-300/80">Your application is under review. You'll be able to start driving once approved.</p>
          </div>
          <p className="text-gray-500 text-sm mt-4">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#1A2D44] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] placeholder-gray-600 transition text-sm";
  const labelCls = "block text-gray-400 text-xs mb-1.5 font-medium uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-[#0F1B2D] px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">RIDEN</h1>
          <p className="text-[#22C55E] text-sm font-semibold mt-1 tracking-widest uppercase">Captain Registration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <div className="bg-[#1A2D44]/50 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Personal Information</h3>
            <div>
              <label className={labelCls}>Full Name</label>
              <input type="text" value={form.name} onChange={set("name")} required placeholder="Ahmad Al-Rashidi" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={form.phone} onChange={set("phone")} required placeholder="+962791234567" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={set("email")} required placeholder="ahmad@example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={form.password} onChange={set("password")} required placeholder="••••••••" className={inputCls} />
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-[#1A2D44]/50 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Vehicle & License</h3>
            <div>
              <label className={labelCls}>License Number</label>
              <input type="text" value={form.licenseNumber} onChange={set("licenseNumber")} required placeholder="JO-1234567" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Make</label>
                <input type="text" value={form.vehicleMake} onChange={set("vehicleMake")} required placeholder="Toyota" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input type="text" value={form.vehicleModel} onChange={set("vehicleModel")} required placeholder="Camry" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Plate</label>
                <input type="text" value={form.vehiclePlate} onChange={set("vehiclePlate")} required placeholder="ABC-1234" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input type="number" value={form.vehicleYear} onChange={set("vehicleYear")} required placeholder="2020" min="2000" max="2025" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input type="text" value={form.vehicleColor} onChange={set("vehicleColor")} required placeholder="White" className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? "Submitting…" : "Register as Captain"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-4">
          Already registered?{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setLocation("/login"); }}
            className="text-[#22C55E] hover:text-[#16a34a] font-medium transition"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
