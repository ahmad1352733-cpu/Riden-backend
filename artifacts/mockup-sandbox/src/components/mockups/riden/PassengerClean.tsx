import React, { useState } from "react";

export function PassengerClean() {
  const [step, setStep] = useState<"home"|"booked">("home");

  return (
    <div style={{
      width: 390, minHeight: 844, background: "#F0F4F8",
      fontFamily: "'Inter', sans-serif", direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      {/* Map */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #E0ECF8 0%, #CCDDF4 50%, #BDD0EF 100%)" }}>
          <svg width="390" height="844" style={{ position: "absolute", opacity: 0.4 }}>
            <path d="M 0 310 Q 130 270 210 295 T 390 270" stroke="#A8C4E0" strokeWidth="16" fill="none" strokeLinecap="round" />
            <path d="M 0 390 Q 155 415 255 375 T 390 355" stroke="#A8C4E0" strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d="M 115 180 L 115 640" stroke="#A8C4E0" strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M 265 140 L 265 720" stroke="#A8C4E0" strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d="M 0 310 Q 130 270 210 295 T 390 270" stroke="white" strokeWidth="4" fill="none" strokeDasharray="18 12" opacity="0.8" />
            <path d="M 115 180 L 115 640" stroke="white" strokeWidth="3" fill="none" strokeDasharray="15 12" opacity="0.8" />
          </svg>
          <div style={{ position: "absolute", top: 290, left: 165, textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>📍</div>
            <div style={{ width: 60, height: 16, borderRadius: 8, background: "rgba(22,163,74,0.2)", margin: "-2px auto 0" }} />
          </div>
          <div style={{ position: "absolute", top: 240, left: 215, fontSize: 18, transform: "rotate(-25deg)" }}>🚗</div>
          <div style={{ position: "absolute", top: 370, left: 88, fontSize: 16, transform: "rotate(10deg)" }}>🚕</div>
        </div>
      </div>

      {/* Top Bar */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "white",
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        padding: "52px 20px 18px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>صباح الخير،</div>
            <div style={{ color: "#0F172A", fontSize: 20, fontWeight: 800 }}>سارة 👋</div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: "#F8FAFC", border: "1px solid #E2E8F0",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, cursor: "pointer",
            }}>🔔</div>
            <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
        background: "white",
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.10)",
        padding: "8px 20px 32px",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E2E8F0", margin: "10px auto 20px" }} />

        {step === "home" ? (
          <>
            <div
              onClick={() => setStep("booked")}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                borderRadius: 18, padding: "14px 16px", cursor: "pointer", marginBottom: 18,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔍</div>
              <span style={{ color: "#94A3B8", fontSize: 15 }}>إلى أين تريد الذهاب؟</span>
            </div>

            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>الأماكن المفضلة</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { icon: "🏠", label: "البيت", sub: "حي النزهة", color: "#EFF6FF" },
                { icon: "💼", label: "العمل", sub: "وسط البلد", color: "#FFF7ED" },
                { icon: "🛒", label: "المول", sub: "سيتي مول", color: "#F0FDF4" },
              ].map((p) => (
                <div key={p.label} onClick={() => setStep("booked")} style={{
                  flex: 1, background: p.color,
                  border: "1px solid #E2E8F0",
                  borderRadius: 18, padding: "14px 8px", textAlign: "center", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 24 }}>{p.icon}</div>
                  <div style={{ color: "#0F172A", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{p.label}</div>
                  <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }}>{p.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, letterSpacing: 0.5 }}>نوع الرحلة</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[
                { icon: "🚗", label: "اقتصادي", price: "من 2 د.أ", active: true },
                { icon: "🚙", label: "مريح", price: "من 4 د.أ", active: false },
                { icon: "⭐", label: "مميز", price: "من 7 د.أ", active: false },
              ].map((t) => (
                <div key={t.label} style={{
                  flex: 1,
                  background: t.active ? "#F0FDF4" : "#F8FAFC",
                  border: `1.5px solid ${t.active ? "#16A34A" : "#E2E8F0"}`,
                  borderRadius: 16, padding: "12px 8px", textAlign: "center", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 22 }}>{t.icon}</div>
                  <div style={{ color: t.active ? "#16A34A" : "#374151", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{t.label}</div>
                  <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 2 }}>{t.price}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep("booked")} style={{
              width: "100%", padding: "15px", borderRadius: 18, border: "none", cursor: "pointer",
              background: "#16A34A", color: "white",
              fontSize: 16, fontWeight: 800,
              boxShadow: "0 4px 16px rgba(22,163,74,0.3)",
            }}>
              احجز رحلة 🚗
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 70, height: 70, borderRadius: 22,
                background: "#F0FDF4", margin: "0 auto 12px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
              }}>🚗</div>
              <div style={{ color: "#0F172A", fontSize: 17, fontWeight: 800 }}>الكابتن في طريقه إليك</div>
              <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>يصل خلال ~4 دقائق</div>
              {/* Progress bar */}
              <div style={{ background: "#F1F5F9", borderRadius: 4, height: 6, marginTop: 14, overflow: "hidden" }}>
                <div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, #16A34A, #22C55E)", borderRadius: 4 }} />
              </div>
            </div>

            <div style={{
              background: "#F8FAFC", borderRadius: 20,
              border: "1px solid #E2E8F0", padding: 16,
              display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: 16,
                background: "linear-gradient(135deg, #22C55E, #16A34A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800, color: "white",
              }}>م</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0F172A", fontSize: 15, fontWeight: 700 }}>محمد الأحمد</div>
                <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>تويوتا كامري • أبيض</div>
                <div style={{
                  display: "inline-block", marginTop: 4,
                  background: "#F1F5F9", borderRadius: 8, padding: "2px 8px",
                  color: "#374151", fontSize: 11, fontWeight: 700,
                }}>أ ب ج - 1234</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#F59E0B", fontSize: 13, fontWeight: 700 }}>★ 4.9</div>
                <div style={{
                  width: 42, height: 42, borderRadius: 14, background: "#F0FDF4",
                  border: "1px solid #DCFCE7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, cursor: "pointer", marginTop: 6,
                }}>📞</div>
              </div>
            </div>

            <button onClick={() => setStep("home")} style={{
              width: "100%", padding: "14px", borderRadius: 16,
              border: "1.5px solid #FECACA",
              background: "#FFF5F5", color: "#EF4444",
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
