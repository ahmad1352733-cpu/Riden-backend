import { useGetCaptainTrips } from "@workspace/api-client-react";
import type { Trip } from "@workspace/api-client-react";

function statusColor(status: Trip["status"]) {
  switch (status) {
    case "completed": return "bg-[#22C55E]/20 text-[#22C55E]";
    case "accepted": return "bg-blue-500/20 text-blue-400";
    case "started": return "bg-yellow-500/20 text-yellow-400";
    case "cancelled": return "bg-red-500/20 text-red-400";
    case "pending": return "bg-gray-500/20 text-gray-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-JO", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TripsPage() {
  const { data: trips, isLoading } = useGetCaptainTrips();

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-white font-bold text-xl">My Trips</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1A2D44] rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : !trips?.length ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">🚗</div>
          <p className="font-medium">No trips yet</p>
          <p className="text-sm mt-1">Go online to start receiving rides</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(trip.status)}`}>
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </span>
                  {trip.passenger && (
                    <span className="text-gray-400 text-xs">👤 {trip.passenger.name}</span>
                  )}
                </div>
                {trip.finalFare != null ? (
                  <span className="text-[#22C55E] font-bold text-sm">{trip.finalFare.toFixed(2)} JOD</span>
                ) : trip.fare != null ? (
                  <span className="text-gray-400 font-semibold text-sm">{trip.fare.toFixed(2)} JOD</span>
                ) : null}
              </div>

              {/* Route */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[#22C55E] text-xs mt-0.5">●</span>
                  <p className="text-white text-sm leading-tight">{trip.pickupAddress}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-xs mt-0.5">■</span>
                  <p className="text-gray-300 text-sm leading-tight">{trip.dropoffAddress}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <p className="text-gray-600 text-xs">{formatDate(trip.createdAt)}</p>
                {trip.distanceKm && (
                  <p className="text-gray-500 text-xs">{trip.distanceKm.toFixed(1)} km</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
