import React, { useState } from "react";

export function CaptainMidnight() {
  const [online, setOnline] = useState(true);

  return (
    <div style={{
      width: 390, minHeight: 844, background: "#080F1E",
      fontFamily: "'Inter', sans-serif", direction: "rtl", position: "relative", overflow: "hidden",
    }}>
      {/* Map background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #0D1B2E 0%, #0A1628 60%, #081220 100%)",
      }}>
        {/* Grid lines simulating map */}
        <svg width="390" height="844" style={{ position: "absolute", opacity: 0.06 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 45} x2="390" y2={i * 45} stroke="#38BDF8" strokeWidth="1" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 45} y1="0" x2={i * 45} y2="844" stroke="#38BDF8" strokeWidth="1" />
          ))}
          {/* Roads */}
          <path d="M 0 320 Q 120 280 200 300 T 390 280" stroke="#1E3A5F" strokeWidth="12" fill="none" />
          <path d="M 0 400 Q 150 420 250 380 T 390 360" stroke="#1E3A5F" strokeWidth="8" fill="none" />
          <path d="M 100 200 L 100 600" stroke="#1E3A5F" strokeWidth="10" fill="none" />
          <path d="M 260 150 L 260 700" stroke="#1E3A5F" strokeWidth="8" fill="none" />
          {/* Main road highlight */}
          <path d="M 0 320 Q 120 280 200 300 T 390 280" stroke="#162B45" strokeWidth="10" fill="none" />
        </svg>

        {/* Glowing location markers */}
        <div style={{ position: "absolute", top: 280, left: 180 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 20px #22C55E, 0 0 40px #22C55E55" }} />
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#22C55E11", border: "1px solid #22C55E33", position: "absolute", top: -23, left: -23 }} />
        </div>
        <div style={{ position: "absolute", top: 200, left: 240, width: 10, height: 10, borderRadius: "50%", background: "#38BDF8", boxShadow: "0 0 15px #38BDF8" }} />
      </div>

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        padding: "52px 20px 16px",
        background: "linear-gradient(180deg, rgba(8,15,30,0.97) 0%, rgba(8,15,30,0.85) 80%, transparent 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: "50%",
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#080F1E",
              boxShadow: "0 0 15px #22C55E55",
            }}>خ</div>
            <div>
              <div style={{ color: "#E2E8F0", fontSize: 15, fontWeight: 700 }}>خالد أحمد</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#FCD34D", fontSize: 11 }}>★</span>
                <span style={{ color: "#94A3B8", fontSize: 12 }}>4.9</span>
              </div>
            </div>
          </div>

          {/* Online Toggle */}
          <button
            onClick={() => setOnline(!online)}
            style={{
              padding: "8px 18px", borderRadius: 24, border: "none", cursor: "pointer",
              background: online
                ? "linear-gradient(135deg, #22C55E, #16A34A)"
                : "rgba(255,255,255,0.08)",
              color: online ? "#080F1E" : "#64748B",
              fontSize: 13, fontWeight: 700,
              boxShadow: online ? "0 0 20px #22C55E44" : "none",
              transition: "all 0.3s",
            }}
          >
            {online ? "● متاح" : "○ غير متاح"}
          </button>
        </div>

        {/* Stats Strip */}
        <div style={{
          display: "flex", gap: 10, marginTop: 16,
        }}>
          {[
            { label: "الأرباح", value: "24.5 د.أ", color: "#22C55E" },
            { label: "الرحلات", value: "7", color: "#38BDF8" },
            { label: "التقييم", value: "4.9 ★", color: "#FCD34D" },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trip Request Card */}
      {online && (
        <div style={{
          position: "absolute", bottom: 90, left: 16, right: 16, zIndex: 20,
          background: "rgba(13, 27, 46, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: 24,
          boxShadow: "0 -4px 40px rgba(34,197,94,0.15), 0 20px 60px rgba(0,0,0,0.5)",
          padding: 20,
        }}>
          {/* Notification Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: "#22C55E",
                boxShadow: "0 0 8px #22C55E",
                animation: "pulse 1.5s infinite",
              }} />
              <span style={{ color: "#22C55E", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>🔔 طلب رحلة جديد</span>
            </div>
            <span style={{
              background: "rgba(34,197,94,0.15)", color: "#22C55E",
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              border: "1px solid rgba(34,197,94,0.3)",
            }}>جديد</span>
          </div>

          {/* Route */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E", flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1", fontSize: 14 }}>شارع الجامعة، عمّان</span>
            </div>
            <div style={{ width: 1, height: 14, background: "#1E3A5F", marginRight: 4 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#EF4444", boxShadow: "0 0 8px #EF4444", flexShrink: 0 }} />
              <span style={{ color: "#CBD5E1", fontSize: 14 }}>مول العرب، الزرقاء</span>
            </div>
          </div>

          {/* Info Row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { icon: "📍", text: "8.2 كم" },
              { icon: "⏱", text: "18 دقيقة" },
              { icon: "💵", text: "4.50 د.أ" },
            ].map((item) => (
              <div key={item.text} style={{
                flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10,
                padding: "8px 6px", textAlign: "center",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 14 }}>{item.icon}</div>
                <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>{item.text}</div>
              </div>
            ))}
          </div>

          {/* Accept Button */}
          <button style={{
            width: "100%", padding: "15px", borderRadius: 16, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            color: "#080F1E", fontSize: 16, fontWeight: 800,
            boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
            letterSpacing: 0.5,
          }}>
            ✓  قبول الرحلة
          </button>
        </div>
      )}

      {!online && (
        <div style={{
          position: "absolute", bottom: 90, left: 16, right: 16, zIndex: 20,
          background: "rgba(13, 27, 46, 0.9)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24,
          padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌙</div>
          <div style={{ color: "#475569", fontSize: 15, fontWeight: 600 }}>أنت غير متاح حالياً</div>
          <div style={{ color: "#334155", fontSize: 13, marginTop: 4 }}>فعّل المتاح لاستقبال الرحلات</div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30,
        height: 80,
        background: "rgba(8,15,30,0.98)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        paddingBottom: 8,
      }}>
        {[
          { icon: "🏠", label: "الرئيسية", active: true },
          { icon: "🗺️", label: "الرحلات", active: false },
          { icon: "💰", label: "الأرباح", active: false },
          { icon: "👤", label: "حسابي", active: false },
        ].map((tab) => (
          <div key={tab.label} style={{ textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 22 }}>{tab.icon}</div>
            <div style={{
              fontSize: 10, fontWeight: 600, marginTop: 2,
              color: tab.active ? "#22C55E" : "#334155",
            }}>{tab.label}</div>
            {tab.active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#22C55E", margin: "3px auto 0", boxShadow: "0 0 6px #22C55E" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
