import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useGetMe } from "@workspace/api-client-react";

interface LayoutProps {
  title: string;
  children: ReactNode;
}

export function Layout({ title, children }: LayoutProps) {
  const { data: me } = useGetMe();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold text-white">
              {me?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{me?.name ?? "Admin"}</p>
              <p className="text-xs text-gray-500">{me?.role ?? "admin"}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
