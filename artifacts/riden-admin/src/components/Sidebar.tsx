import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

const navItems = [
  { icon: "📊", label: "Dashboard", path: "/" },
  { icon: "🚗", label: "Captains", path: "/captains" },
  { icon: "👥", label: "Passengers", path: "/passengers" },
  { icon: "🗺️", label: "Trips", path: "/trips" },
  { icon: "⚠️", label: "Complaints", path: "/complaints" },
  { icon: "📍", label: "Routes", path: "/routes" },
  { icon: "🎟️", label: "Discount Codes", path: "/discount-codes" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: me } = useGetMe();

  const handleLogout = () => {
    localStorage.removeItem("riden_token");
    window.location.href = "/admin/login";
  };

  return (
    <div
      className="fixed left-0 top-0 h-screen w-64 flex flex-col z-10"
      style={{ backgroundColor: "#0F1B2D" }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-2xl font-extrabold" style={{ color: "#D4A017" }}>
          RIDEN
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#D4A01799" }}>
          Admin Panel
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <a
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: "#D4A017", color: "#0F1B2D" }
                    : { color: "#CBD5E1" }
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="mb-2">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-sm font-medium text-white truncate">
            {me?.name ?? "Admin"}
          </p>
          <p className="text-xs text-slate-500 truncate">{me?.email ?? ""}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
