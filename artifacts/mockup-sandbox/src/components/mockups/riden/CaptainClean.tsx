import React, { useState } from "react";

export function CaptainClean() {
  const [online, setOnline] = useState(true);

  return (
    <div style={{
      width: 390, minHeight: 844, background: "#F0F4F8",
      fontFamily: "'Inter', sans-serif", direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      {/* Map */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #E8F0FB 0%, #D6E4F7 50%, #C9D9F2 100%)" }}>
          <svg width="390" height="844" style={{ position: "absolute", opacity: 0.35 }}>
            <path d="M 0 310 Q 130 270 210 295 T 390 270" stroke="#BFCFE8" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M 0 380 Q 160 405 255 365 T 390 345" stroke="#BFCFE8" strokeWidth="10" fill="none" strokeLinecap="round" />
            <path d="M 110 180 L 110 620" stroke="#BFCFE8" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M 265 140 L 265 720" stroke="#BFCFE8" strokeWidth="10" fill="none" strokeLinecap="round" />
            {/* White road centers */}
            <path d="M 0 310 Q 130 270 210 295 T 390 270" stroke="white" strokeWidth="3" fill="none" strokeDasharray="16 10" />
            <path d="M 110 180 L 110 620" stroke="white" strokeWidth="2" fill="none" strokeDasharray="14 10" />
          </svg>
          {/* Location pin */}
          <div style={{ position: "absolute", top: 265, left: 175, textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>📍</div>
            <div style={{
              width: 70, height: 20, borderRadius: 10,
              background: "rgba(22,163,74,0.15)", margin: "-4px auto 0",
            }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "white",
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        padding: "52px 20px 20px",
        boxShadow: "0 4px 30px rgba(0,0,0,0.08)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, color: "white",
            }}>خ</div>
            <div>
              <div style={{ color: "#0F172A", fontSize: 16, fontWeight: 700 }}>خالد أحمد</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#F59E0B", fontSize: 12 }}>★★★★★</span>
                <span style={{ color: "#64748B", fontSize: 12 }}>4.9</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setOnline(!online)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 30, border: "none", cursor: "pointer",
              background: online ? "#16A34A" : "#F1F5F9",
              color: online ? "white" : "#94A3B8",
              fontSize: 13, fontWeight: 700,
              boxShadow: online ? "0 4px 14px rgba(22,163,74,0.35)" : "none",
              transition: "all 0.25s",
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: online ? "rgba(255,255,255,0.8)" : "#CBD5E1",
            }} />
            {online ? "متاح" : "غير متاح"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[
            { label: "الأرباح اليوم", value: "24.5 د.أ", icon: "💵", color: "#16A34A", bg: "#F0FDF4" },
            { label: "الرحلات", value: "7 رحلات", icon: "🚗", color: "#2563EB", bg: "#EFF6FF" },
            { label: "التقييم", value: "4.9 ★", icon: "⭐", color: "#D97706", bg: "#FFFBEB" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: s.bg, borderRadius: 14, padding: "10px 10px",
              border: `1px solid ${s.color}22`,
            }}>
              <div style={{ fontSize: 16 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: 15, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
              <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Request Card */}
      {online && (
        <div style={{
          position: "absolute", bottom: 84, left: 16, right: 16, zIndex: 20,
          background: "white",
          borderRadius: 28,
          boxShadow: "0 -2px 40px rgba(0,0,0,0.12), 0 20px 60px rgba(0,0,0,0.08)",
          padding: 20,
          border: "2px solid #22C55E22",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
              <span style={{ color: "#0F172A", fontSize: 15, fontWeight: 700 }}>طلب رحلة جديد</span>
            </div>
            <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>جديد</span>
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: 14 }}>شارع الجامعة، عمّان</span>
            </div>
            <div style={{ width: 1, height: 16, background: "#E2E8F0", margin: "0 4px 10px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#EF4444", flexShrink: 0 }} />
              <span style={{ color: "#374151", fontSize: 14 }}>مول العرب، الزرقاء</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { icon: "📍", label: "المسافة", value: "8.2 كم" },
              { icon: "⏱", label: "الوقت", value: "18 د" },
              { icon: "💵", label: "الأجرة", value: "4.50 د.أ" },
            ].map((item) => (
              <div key={item.label} style={{
                flex: 1, background: "#F8FAFC", borderRadius: 12,
                padding: "8px 6px", textAlign: "center",
                border: "1px solid #E2E8F0",
              }}>
                <div style={{ fontSize: 14 }}>{item.icon}</div>
                <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 700, marginTop: 2 }}>{item.value}</div>
                <div style={{ color: "#94A3B8", fontSize: 10 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <button style={{
            width: "100%", padding: "15px", borderRadius: 18, border: "none", cursor: "pointer",
            background: "#16A34A", color: "white",
            fontSize: 16, fontWeight: 800,
            boxShadow: "0 4px 16px rgba(22,163,74,0.3)",
          }}>
            قبول الرحلة ✓
          </button>
        </div>
      )}

      {!online && (
        <div style={{
          position: "absolute", bottom: 84, left: 16, right: 16, zIndex: 20,
          background: "white", borderRadius: 24, padding: 24, textAlign: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>😴</div>
          <div style={{ color: "#0F172A", fontSize: 15, fontWeight: 700 }}>أنت في وضع الراحة</div>
          <div style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>فعّل المتاح للبدء</div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
        height: 76, background: "white",
        borderTop: "1px solid #F1F5F9",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        paddingBottom: 4,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      }}>
        {[
          { icon: "🏠", label: "الرئيسية", active: true },
          { icon: "📋", label: "الرحلات", active: false },
          { icon: "💰", label: "الأرباح", active: false },
          { icon: "👤", label: "حسابي", active: false },
        ].map((tab) => (
          <div key={tab.label} style={{ textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 22 }}>{tab.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: tab.active ? "#16A34A" : "#CBD5E1" }}>{tab.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
