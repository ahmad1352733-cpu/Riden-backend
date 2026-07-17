import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = "/api";
const getToken = () => localStorage.getItem("riden_token");
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

const TARGET_OPTIONS = [
  { value: "all",        label: "🌐 الكل (كباتن + ركاب)" },
  { value: "captains",   label: "🚗 الكباتن فقط" },
  { value: "passengers", label: "👥 الركاب فقط" },
];

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", target: "all" });
  const [success, setSuccess] = useState("");
  const [error, setError]   = useState("");

  const { data: sent = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notifications"],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/notifications`, { headers: authHeaders() });
      return r.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/admin/notifications`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      setSuccess("تم إرسال الإشعار بنجاح ✅");
      setError("");
      setForm({ title: "", body: "", target: "all" });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e: any) => {
      setError("فشل الإرسال: " + e.message);
      setSuccess("");
    },
  });

  const handleSend = () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("العنوان والمحتوى مطلوبان"); return;
    }
    setError("");
    sendMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">إرسال إشعارات</h1>

      {/* ── نموذج الإرسال ── */}
      <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ backgroundColor: "#1A2D44" }}>
        <h2 className="text-lg font-semibold text-white text-right">إشعار جديد</h2>

        {success && <div className="bg-green-900/40 border border-green-500/50 text-green-300 rounded-xl px-4 py-3 text-sm text-right">{success}</div>}
        {error   && <div className="bg-red-900/40 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 text-sm text-right">{error}</div>}

        {/* الجمهور */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-400 text-right">المستهدفون</label>
          <div className="flex gap-2 flex-wrap justify-end">
            {TARGET_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setForm(f => ({ ...f, target: o.value }))}
                className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                style={form.target === o.value
                  ? { backgroundColor: "#D4A017", borderColor: "#D4A017", color: "#0F1B2D" }
                  : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#CBD5E1" }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* العنوان */}
        <div className="space-y-1">
          <label className="block text-sm text-slate-400 text-right">العنوان</label>
          <input
            className="w-full rounded-xl px-4 py-3 text-right text-white text-sm border border-white/10 outline-none focus:border-yellow-500/50"
            style={{ backgroundColor: "#0F1B2D" }}
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="عنوان الإشعار..."
            dir="rtl"
          />
        </div>

        {/* المحتوى */}
        <div className="space-y-1">
          <label className="block text-sm text-slate-400 text-right">المحتوى</label>
          <textarea
            className="w-full rounded-xl px-4 py-3 text-right text-white text-sm border border-white/10 outline-none focus:border-yellow-500/50 resize-none"
            style={{ backgroundColor: "#0F1B2D" }}
            rows={3}
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="نص الإشعار..."
            dir="rtl"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="px-8 py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#D4A017", color: "#0F1B2D" }}
          >
            {sendMutation.isPending ? "جار الإرسال..." : "📨 إرسال الإشعار"}
          </button>
        </div>
      </div>

      {/* ── الإشعارات المرسلة ── */}
      <div className="rounded-2xl border border-white/10 p-6 space-y-3" style={{ backgroundColor: "#1A2D44" }}>
        <h2 className="text-lg font-semibold text-white text-right">الإشعارات المرسلة</h2>
        {isLoading ? (
          <p className="text-slate-400 text-sm text-center py-4">جار التحميل...</p>
        ) : sent.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">لا توجد إشعارات مرسلة</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sent.map((n: any) => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/5" style={{ backgroundColor: "#0F1B2D" }}>
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-xs text-slate-500">
                      {TARGET_OPTIONS.find(t => t.value === n.target)?.label ?? n.target}
                    </span>
                    <span className="font-semibold text-white text-sm">{n.title}</span>
                  </div>
                  <p className="text-sm text-slate-400">{n.body}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(n.createdAt).toLocaleString("ar-JO")}
                  </p>
                </div>
                <div className="text-xl">🔔</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
