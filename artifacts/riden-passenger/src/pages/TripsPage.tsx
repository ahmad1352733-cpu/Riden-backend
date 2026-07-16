import { useState } from "react";
import { useGetPassengerTrips, useRateTrip } from "@workspace/api-client-react";
import type { Trip } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    pending: { label: "Pending", classes: "bg-yellow-500/20 text-yellow-400" },
    accepted: { label: "Accepted", classes: "bg-blue-500/20 text-blue-400" },
    started: { label: "In Progress", classes: "bg-green-500/20 text-green-400" },
    completed: { label: "Completed", classes: "bg-emerald-500/20 text-emerald-400" },
    cancelled: { label: "Cancelled", classes: "bg-red-500/20 text-red-400" },
  };
  const c = config[status] || { label: status, classes: "bg-gray-500/20 text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.classes}`}>
      {c.label}
    </span>
  );
}

function StarRating({
  tripId,
  onRated,
}: {
  tripId: number;
  onRated: () => void;
}) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rateTripMutation = useRateTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "⭐ Thanks for rating!", description: "Your feedback helps improve our service" });
        queryClient.invalidateQueries({ queryKey: ["/api/passengers/trips"] });
        onRated();
      },
      onError: () => {
        toast({ title: "Error", description: "Could not submit rating", variant: "destructive" });
      },
    },
  });

  const handleSubmit = () => {
    if (!selectedStar) return;
    rateTripMutation.mutate({ id: tripId, data: { rating: selectedStar } });
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#2A3F5A]">
      <p className="text-gray-400 text-xs mb-2">Rate this trip</p>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setSelectedStar(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="text-2xl transition-transform hover:scale-110"
          >
            <span className={(hoveredStar || selectedStar) >= star ? "text-[#F5A623]" : "text-gray-600"}>
              ★
            </span>
          </button>
        ))}
      </div>
      {selectedStar > 0 && (
        <button
          onClick={handleSubmit}
          disabled={rateTripMutation.isPending}
          className="bg-[#F5A623] text-[#0F1B2D] font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#e8961a] transition-colors disabled:opacity-50"
        >
          {rateTripMutation.isPending ? "Submitting..." : "Submit Rating"}
        </button>
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const [rated, setRated] = useState(false);
  const isCompleted = trip.status === "completed";
  const needsRating = isCompleted && !trip.rating && !rated;
  const date = new Date(trip.createdAt);

  return (
    <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-gray-500 text-xs mb-1">
            Trip #{trip.id} · {date.toLocaleDateString("en-JO", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <StatusBadge status={trip.status} />
        </div>
        {trip.finalFare != null ? (
          <div className="text-right">
            <p className="text-[#F5A623] font-black text-lg">{trip.finalFare.toFixed(2)} JOD</p>
            {trip.discountPercent != null && trip.discountPercent > 0 && (
              <p className="text-green-400 text-xs">-{trip.discountPercent}% off</p>
            )}
          </div>
        ) : trip.fare != null ? (
          <p className="text-[#F5A623] font-black text-lg">{trip.fare.toFixed(2)} JOD</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F5A623] mt-1 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-gray-500 text-xs">From</p>
            <p className="text-white text-sm truncate">{trip.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-gray-500 text-xs">To</p>
            <p className="text-white text-sm truncate">{trip.dropoffAddress}</p>
          </div>
        </div>
      </div>

      {trip.rating != null && (
        <div className="mt-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= trip.rating! ? "text-[#F5A623]" : "text-gray-600"}>★</span>
          ))}
          <span className="text-gray-400 text-xs ml-1">Your rating</span>
        </div>
      )}

      {needsRating && <StarRating tripId={trip.id} onRated={() => setRated(true)} />}
    </div>
  );
}

export default function TripsPage() {
  const { data: trips, isLoading } = useGetPassengerTrips();

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">My Trips</h1>
        <p className="text-gray-400 text-sm mt-0.5">Your ride history</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1A2D44] rounded-2xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : !trips || trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🚗</span>
          <p className="text-white font-bold text-lg">No trips yet</p>
          <p className="text-gray-400 text-sm mt-1">Book your first ride from the home page</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
