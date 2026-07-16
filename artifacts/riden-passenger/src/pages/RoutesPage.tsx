import { useGetRoutes } from "@workspace/api-client-react";

export default function RoutesPage() {
  const { data: routes, isLoading } = useGetRoutes();

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Routes</h1>
        <p className="text-gray-400 text-sm mt-0.5">Available routes in Jordan</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1A2D44] rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : !routes || routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🗺️</span>
          <p className="text-white font-bold text-lg">No routes available</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {routes.map((route) => (
            <div
              key={route.id}
              className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg border border-[#2A3F5A] hover:border-[#F5A623]/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-[#F5A623] font-bold text-base">{route.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  route.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {route.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F5A623] flex-shrink-0" />
                    <p className="text-white text-sm font-medium truncate">{route.pickupArea}</p>
                  </div>
                  <div className="ml-1 border-l-2 border-dashed border-[#2A3F5A] h-3 ml-[4px]" />
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    <p className="text-white text-sm font-medium truncate">{route.dropoffArea}</p>
                  </div>
                </div>
                <div className="text-2xl opacity-50">→</div>
              </div>

              {route.description && (
                <p className="text-gray-500 text-xs mt-3 border-t border-[#2A3F5A] pt-2">
                  {route.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
