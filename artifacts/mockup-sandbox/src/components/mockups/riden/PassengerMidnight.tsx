import React, { useState } from "react";

export function PassengerMidnight() {
  const [step, setStep] = useState<"home"|"booked">("home");

  return (
    <div style={{
      width: 390, minHeight: 844, background: "#080F1E",
      fontFamily: "'Inter', sans-serif", direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      {/* Map */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0D1B2E 0%, #0A1628 60%, #081220 100%)" }}>
          <svg width="390" height="844" style={{ position: "absolute", opacity: 0.07 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 45} x2="390" y2={i * 45} stroke="#38BDF8" strokeWidth="0.8" />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 45} y1="0" x2={i * 45} y2="844" stroke="#38BDF8" strokeWidth="0.8" />
            ))}
            <path d="M 0 310 Q 130 270 210 295 T 390 270" stroke="#1E3A5F" strokeWidth="14" fill="none" />
            <path d="M 0 390 Q 155 415 255 375 T 390 355" stroke="#1E3A5F" strokeWidth="9" fill="none" />
            <path d="M 115 180 L 115 640" stroke="#1E3A5F" strokeWidth="11" fill="none" />
            <path d="M 265 140 L 265 720" stroke="#1E3A5F" strokeWidth="9" fill="none" />
          </svg>
          {/* My location */}
          <div style={{ position: "absolute", top: 300, left: 170 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#38BDF8", boxShadow: "0 0 20px #38BDF8, 0 0 40px #38BDF855", border: "2px solid white" }} />
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#38BDF811", border: "1px solid #38BDF833", position: "absolute", top: -27, left: -27 }} />
          </div>
          {/* Car icons */}
          <div style={{ position: "absolute", top: 245, left: 220, fontSize: 18, transform: "rotate(-30deg)" }}>🚗</div>
          <div style={{ position: "absolute", top: 370, left: 90, fontSize: 16, transform: "rotate(15deg)" }}>🚕</div>
        </div>
      </div>

      {/* Top Bar */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "52px 20px 16px",
        background: "linear-gradient(180deg, rgba(8,15,30,0.95) 0%, rgba(8,15,30,0.8) 80%, transparent 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#64748B", fontSize: 12 }}>مرحباً،</div>
            <div style={{ color: "#E2E8F0", fontSize: 18, fontWeight: 800 }}>سارة 👋</div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, cursor: "pointer",
            }}>🔔</div>
            <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E" }} />
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
        background: "rgba(10,18,32,0.97)",
        backdropFilter: "blur(20px)",
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        padding: "8px 20px 32px",
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "10px auto 20px" }} />

        {step === "home" ? (
          <>
            {/* Search */}
            <div
              onClick={() => setStep("booked")}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18, padding: "14px 16px", cursor: "pointer",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
              <span style={{ color: "#475569", fontSize: 15 }}>إلى أين تريد الذهاب؟</span>
            </div>

            {/* Quick Places */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "#475569", fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>الأماكن المفضلة</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { icon: "🏠", label: "البيت", sub: "حي النزهة" },
                  { icon: "💼", label: "العمل", sub: "وسط البلد" },
                  { icon: "🛒", label: "المول", sub: "سيتي مول" },
                ].map((p) => (
                  <div key={p.label} onClick={() => setStep("booked")} style={{
                    flex: 1, background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 16, padding: "12px 8px", textAlign: "center", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 22 }}>{p.icon}</div>
                    <div style={{ color: "#CBD5E1", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{p.label}</div>
                    <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>{p.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ride Types */}
            <div style={{ color: "#475569", fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>نوع الرحلة</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { icon: "🚗", label: "اقتصادي", price: "من 2 د.أ", active: true },
                { icon: "🚙", label: "مريح", price: "من 4 د.أ", active: false },
                { icon: "⭐", label: "مميز", price: "من 7 د.أ", active: false },
              ].map((t) => (
                <div key={t.label} style={{
                  flex: 1,
                  background: t.active ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${t.active ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 16, padding: "12px 8px", textAlign: "center", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 22 }}>{t.icon}</div>
                  <div style={{ color: t.active ? "#22C55E" : "#CBD5E1", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{t.label}</div>
                  <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{t.price}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep("booked")} style={{
              width: "100%", padding: "15px", borderRadius: 18, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              color: "#080F1E", fontSize: 16, fontWeight: 800,
              boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
            }}>
              احجز رحلة
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🚗</div>
              <div style={{ color: "#22C55E", fontSize: 16, fontWeight: 800 }}>الكابتن في طريقه إليك</div>
              <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>يصل خلال ~4 دقائق</div>
            </div>
            {/* Captain card */}
            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.07)", padding: 16,
              display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "linear-gradient(135deg, #22C55E, #16A34A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800, color: "#080F1E",
              }}>م</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#E2E8F0", fontSize: 15, fontWeight: 700 }}>محمد الأحمد</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>تويوتا كامري • أبيض</div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>أ ب ج - 1234</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#FCD34D", fontSize: 14 }}>★ 4.9</div>
                <div style={{ fontSize: 24, cursor: "pointer" }}>📞</div>
              </div>
            </div>
            <button onClick={() => setStep("home")} style={{
              width: "100%", padding: "14px", borderRadius: 18, border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.1)", color: "#EF4444",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              إلغاء الرحلة
            </button>
          </>
        )}
      </div>
    </div>
  );
}
