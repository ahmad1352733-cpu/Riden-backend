import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCaptainProfile,
  useGetCaptainEarnings,
  useGetCaptainPendingTrip,
  useGetCaptainTrips,
  useUpdateCaptainAvailability,
  useAcceptTrip,
  useStartTrip,
  useCompleteTrip,
  getGetCaptainProfileQueryKey,
  getGetCaptainPendingTripQueryKey,
  getGetCaptainTripsQueryKey,
  getGetCaptainEarningsQueryKey,
} from "@workspace/api-client-react";
import type { Trip } from "@workspace/api-client-react";

// Complete Trip Dialog
function CompleteTripDialog({
  tripId,
  onClose,
}: {
  tripId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [error, setError] = useState("");

  const completeTrip = useCompleteTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaptainProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCaptainTripsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCaptainEarningsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCaptainPendingTripQueryKey() });
        onClose();
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || "Failed to complete trip");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    completeTrip.mutate({
      id: tripId,
      data: {
        distanceKm: parseFloat(distanceKm),
        durationMin: parseFloat(durationMin),
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-[#1A2D44] border border-white/10 rounded-2xl w-full max-w-sm p-5">
        <h3 className="text-white font-bold text-lg mb-4">Complete Trip</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wide font-medium">
              Distance (km)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              required
              placeholder="12.5"
              className="w-full bg-[#0F1B2D] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] placeholder-gray-600"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wide font-medium">
              Duration (minutes)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              required
              placeholder="25"
              className="w-full bg-[#0F1B2D] border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] placeholder-gray-600"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={completeTrip.isPending}
              className="flex-1 bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
            >
              {completeTrip.isPending ? "Completing…" : "Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Pending Trip Card
function PendingTripCard({ isApproved }: { isApproved: boolean }) {
  const queryClient = useQueryClient();

  const { data: pendingTrip } = useGetCaptainPendingTrip({
    query: { refetchInterval: 4000, enabled: isApproved } as any,
  });

  const acceptTrip = useAcceptTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaptainProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCaptainPendingTripQueryKey() });
      },
    },
  });

  if (!pendingTrip) {
    return (
      <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">📡</div>
        <p className="text-gray-400 text-sm">Waiting for ride requests…</p>
        <p className="text-gray-600 text-xs mt-1">Polling every 4 seconds</p>
      </div>
    );
  }

  const trip = pendingTrip as Trip;

  return (
    <div className="bg-[#1A2D44] border border-[#22C55E]/40 rounded-2xl p-5 animate-pulse-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
          <span className="text-[#22C55E] font-semibold text-sm">New Ride Request!</span>
        </div>
        {trip.fare && (
          <span className="text-white font-bold">{trip.fare.toFixed(2)} JOD</span>
        )}
      </div>

      {trip.passenger && (
        <p className="text-gray-400 text-sm mb-3">👤 {trip.passenger.name}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-[#22C55E] text-xs mt-1">●</span>
          <div>
            <p className="text-gray-500 text-xs">Pickup</p>
            <p className="text-white text-sm leading-tight">{trip.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-400 text-xs mt-1">■</span>
          <div>
            <p className="text-gray-500 text-xs">Dropoff</p>
            <p className="text-gray-300 text-sm leading-tight">{trip.dropoffAddress}</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => acceptTrip.mutate({ id: trip.id })}
        disabled={acceptTrip.isPending}
        className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition disabled:opacity-60"
      >
        {acceptTrip.isPending ? "Accepting…" : "Accept Trip"}
      </button>
    </div>
  );
}

// Active Trip Panel
function ActiveTripPanel({ trip }: { trip: Trip }) {
  const queryClient = useQueryClient();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  const startTrip = useStartTrip({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaptainProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCaptainTripsQueryKey() });
      },
    },
  });

  return (
    <>
      {showCompleteDialog && (
        <CompleteTripDialog
          tripId={trip.id}
          onClose={() => setShowCompleteDialog(false)}
        />
      )}

      <div className="bg-[#1A2D44] border border-blue-500/30 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-blue-400 font-semibold text-sm">
            {trip.status === "accepted" ? "🚘 Trip Accepted" : "🚀 Trip In Progress"}
          </span>
          {trip.fare && (
            <span className="text-white font-bold">{trip.fare.toFixed(2)} JOD</span>
          )}
        </div>

        {trip.passenger && (
          <p className="text-gray-400 text-sm mb-3">👤 {trip.passenger.name}</p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-[#22C55E] text-xs mt-1">●</span>
            <div>
              <p className="text-gray-500 text-xs">Pickup</p>
              <p className="text-white text-sm">{trip.pickupAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 text-xs mt-1">■</span>
            <div>
              <p className="text-gray-500 text-xs">Dropoff</p>
              <p className="text-gray-300 text-sm">{trip.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {trip.status === "accepted" && (
          <button
            onClick={() => startTrip.mutate({ id: trip.id })}
            disabled={startTrip.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition disabled:opacity-60"
          >
            {startTrip.isPending ? "Starting…" : "Start Trip"}
          </button>
        )}

        {trip.status === "started" && (
          <button
            onClick={() => setShowCompleteDialog(true)}
            className="w-full bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition"
          >
            Complete Trip
          </button>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: captain, isLoading } = useGetCaptainProfile();
  const { data: earnings } = useGetCaptainEarnings();

  const updateAvailability = useUpdateCaptainAvailability({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCaptainProfileQueryKey() });
      },
    },
  });

  // Poll captain profile when online
  useEffect(() => {
    if (!captain?.isOnline) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetCaptainProfileQueryKey() });
    }, 10000);
    return () => clearInterval(interval);
  }, [captain?.isOnline, queryClient]);

  const isApproved = captain?.approvalStatus === "approved";
  const isOnline = captain?.isOnline ?? false;

  // Detect active trip from captain trips list
  const { data: captainTrips } = useGetCaptainTrips({
    query: { enabled: isApproved && isOnline } as any,
  });

  const activeTrip = captainTrips?.find(
    (t) => t.status === "accepted" || t.status === "started"
  ) ?? null;

  const handleToggle = () => {
    if (!isApproved) return;
    updateAvailability.mutate({ data: { isOnline: !isOnline } });
  };

  if (isLoading) {
    return (
      <div className="px-4 py-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A2D44] rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Approval Banner */}
      {captain?.approvalStatus === "pending" && (
        <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <p className="text-yellow-300 font-semibold text-sm">Awaiting admin approval</p>
            <p className="text-yellow-400/70 text-xs">You'll be notified once approved</p>
          </div>
        </div>
      )}
      {captain?.approvalStatus === "rejected" && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">❌</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Registration rejected</p>
            <p className="text-red-400/70 text-xs">Contact support for more information</p>
          </div>
        </div>
      )}

      {/* Balance Widget */}
      <div className="bg-gradient-to-br from-[#1A2D44] via-[#0F2A3D] to-[#0D3344] border border-white/10 rounded-2xl p-5">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Balance</p>
        <p className="text-white font-black text-4xl mb-1">
          {(captain?.balance ?? 0).toFixed(2)}
          <span className="text-gray-400 text-lg font-normal ml-1">JOD</span>
        </p>
        {earnings && (
          <p className="text-gray-500 text-xs">
            Commission rate: {(earnings.commissionRate * 100).toFixed(0)}% · Today: {earnings.todayEarnings.toFixed(2)} JOD
          </p>
        )}
      </div>

      {/* Online Toggle */}
      <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-base">
              {isOnline ? "You're Online" : "You're Offline"}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {!isApproved
                ? "Approval required to go online"
                : isOnline
                ? "Accepting ride requests"
                : "Toggle to start accepting rides"}
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            disabled={!isApproved || updateAvailability.isPending}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
              isOnline ? "bg-[#22C55E]" : "bg-gray-600"
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                isOnline ? "left-9" : "left-1"
              }`}
            />
          </button>
        </div>

        {updateAvailability.isPending && (
          <p className="text-gray-500 text-xs mt-2 text-center">Updating…</p>
        )}
      </div>

      {/* Active Trip Panel */}
      {isApproved && activeTrip && (
        <div>
          <h2 className="text-white font-semibold mb-2 text-sm uppercase tracking-wide">Active Trip</h2>
          <ActiveTripPanel trip={activeTrip} />
        </div>
      )}

      {/* Pending Trip Card */}
      {isApproved && isOnline && !activeTrip && (
        <div>
          <h2 className="text-white font-semibold mb-2 text-sm uppercase tracking-wide">Incoming Requests</h2>
          <PendingTripCard isApproved={isApproved} />
        </div>
      )}
    </div>
  );
}
