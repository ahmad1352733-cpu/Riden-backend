import { useAuth } from "@/hooks/useAuth";
import { useGetActiveTrip, useGetRoutes, useCancelTrip } from "@workspace/api-client-react";
import BookRideForm from "@/components/BookRideForm";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pending: { label: "Looking for captain...", classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    accepted: { label: "Captain on the way", classes: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    started: { label: "Trip in progress", classes: "bg-green-500/20 text-green-400 border-green-500/30" },
    completed: { label: "Completed", classes: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    cancelled: { label: "Cancelled", classes: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${c.classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {c.label}
    </span>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeTrip } = useGetActiveTrip({
    query: {
      refetchInterval: 3000,
    } as any,
  });

  const { data: routes } = useGetRoutes();

  const cancelTripMutation = useCancelTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "Trip cancelled", description: "Your trip has been cancelled" });
        queryClient.invalidateQueries({ queryKey: ["/api/trips/active"] });
      },
      onError: () => {
        toast({ title: "Error", description: "Could not cancel trip", variant: "destructive" });
      },
    },
  });

  const trip = activeTrip;
  const captain = trip?.captain;

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()},{" "}
          <span className="text-[#F5A623]">{user?.name?.split(" ")[0] || "Rider"}!</span>
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {trip ? "You have an active trip" : "Where are you going today?"}
        </p>
      </div>

      {/* Active Trip */}
      {trip ? (
        <div className="space-y-4">
          {/* Trip Status Card */}
          <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Trip #{trip.id}</p>
                <StatusBadge status={trip.status} />
              </div>
              {trip.finalFare != null && (
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Fare</p>
                  <p className="text-[#F5A623] font-black text-lg">{trip.finalFare.toFixed(2)} JOD</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-[#F5A623] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Pickup</p>
                  <p className="text-white text-sm">{trip.pickupAddress || "Amman, Jordan"}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-[#2A3F5A] h-4" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Dropoff</p>
                  <p className="text-white text-sm">{trip.dropoffAddress || "Destination"}</p>
                </div>
              </div>
            </div>

            {/* Live tracking notice */}
            {(trip.status === "accepted" || trip.status === "started") && (
              <div className="mt-4 flex items-center gap-2 bg-[#0F1B2D] rounded-xl px-3 py-2">
                <span className="text-green-400 text-xs animate-pulse">●</span>
                <p className="text-green-400 text-xs font-medium">Live tracking active</p>
              </div>
            )}

            {/* Cancel button for pending trips */}
            {trip.status === "pending" && (
              <button
                onClick={() => cancelTripMutation.mutate({ id: trip.id })}
                disabled={cancelTripMutation.isPending}
                className="mt-4 w-full border border-red-500/50 text-red-400 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {cancelTripMutation.isPending ? "Cancelling..." : "Cancel Trip"}
              </button>
            )}
          </div>

          {/* Captain Info Card */}
          {captain && (
            <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Your Captain</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F5A623]/20 border-2 border-[#F5A623]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#F5A623] text-xl font-black">{captain.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">{captain.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {captain.vehiclePlate && (
                      <span className="bg-[#0F1B2D] border border-[#2A3F5A] text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                        {captain.vehiclePlate}
                      </span>
                    )}
                    {captain.vehicleMake && (
                      <span className="text-gray-400 text-xs">
                        {captain.vehicleMake} {captain.vehicleModel}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`tel:${captain.phone}`}
                  className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  📞
                </a>
              </div>
              {captain.rating > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-white text-sm font-semibold">{captain.rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">rating</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Book Ride Form */
        <BookRideForm />
      )}

      {/* Quick Routes */}
      {routes && routes.length > 0 && (
        <div>
          <h2 className="text-white font-bold text-base mb-3">Popular Routes</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-[#1A2D44] rounded-xl p-4 flex-shrink-0 w-52 border border-[#2A3F5A] hover:border-[#F5A623]/40 transition-colors"
              >
                <p className="text-[#F5A623] font-bold text-sm truncate">{route.name}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-gray-400 text-xs">
                    <span className="text-gray-500">From: </span>
                    {route.pickupArea}
                  </p>
                  <p className="text-gray-400 text-xs">
                    <span className="text-gray-500">To: </span>
                    {route.dropoffArea}
                  </p>
                </div>
                {route.description && (
                  <p className="text-gray-600 text-xs mt-2 truncate">{route.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
