import { useLocation } from "wouter";
import { useGetCaptainProfile } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: captain } = useGetCaptainProfile();

  const handleLogout = () => {
    localStorage.removeItem("riden_token");
    setLocation("/login");
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: "🏠" },
    { path: "/earnings", label: "Earnings", icon: "💰" },
    { path: "/trips", label: "Trips", icon: "🚗" },
    { path: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#1A2D44] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <span className="text-white font-black text-xl tracking-tight">RIDEN</span>
          <span className="text-[#22C55E] text-xs font-semibold tracking-widest uppercase">Captain</span>
          {captain && (
            <div className="flex items-center gap-1.5 ml-2">
              <div
                className={`w-2 h-2 rounded-full ${captain.isOnline ? "bg-[#22C55E] shadow-lg shadow-green-500/50" : "bg-gray-500"}`}
              />
              <span className={`text-xs font-medium ${captain.isOnline ? "text-[#22C55E]" : "text-gray-500"}`}>
                {captain.isOnline ? "Online" : "Offline"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 text-xs font-medium transition px-2 py-1 rounded-lg hover:bg-red-500/10"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1A2D44] border-t border-white/10 z-50">
        <div className="flex">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
                  isActive ? "text-[#22C55E]" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-[#22C55E] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
