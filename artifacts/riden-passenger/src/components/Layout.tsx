import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/trips", label: "My Trips", icon: "🚗" },
  { path: "/complaints", label: "Complaints", icon: "⚠️" },
  { path: "/routes", label: "Routes", icon: "🗺️" },
];

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("riden_token");
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#1A2D44] border-b border-[#2A3F5A] px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center">
            <span className="text-sm font-black text-[#0F1B2D]">R</span>
          </div>
          <span className="text-white font-black text-lg tracking-widest">RIDEN</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-gray-300 text-sm hidden sm:block">
              {user.name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="bg-[#0F1B2D] border border-[#2A3F5A] text-gray-300 text-xs px-3 py-1.5 rounded-lg hover:border-[#F5A623] hover:text-[#F5A623] transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="bg-[#1A2D44] border-t border-[#2A3F5A] fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0 flex-1 ${
                  isActive
                    ? "text-[#F5A623]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className={`text-xs font-medium truncate ${isActive ? "text-[#F5A623]" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[#F5A623] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
