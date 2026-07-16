import { useGetCaptainProfile } from "@workspace/api-client-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`}
        >
          ★
        </span>
      ))}
      <span className="text-gray-400 text-sm ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    approved: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${styles[status] ?? "bg-gray-500/20 text-gray-400"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ProfilePage() {
  const { data: captain, isLoading } = useGetCaptainProfile();

  if (isLoading) {
    return (
      <div className="px-4 py-5 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A2D44] rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!captain) {
    return (
      <div className="px-4 py-10 text-center text-gray-500">
        <p>Could not load profile</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-white font-bold text-xl">Profile</h1>

      {/* Captain Card */}
      <div className="bg-gradient-to-br from-[#1A2D44] to-[#0F1B2D] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 border-2 border-[#22C55E]/40 flex items-center justify-center text-2xl">
            {captain.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">{captain.name}</h2>
            <p className="text-gray-400 text-sm">{captain.email}</p>
            <p className="text-gray-400 text-sm">{captain.phone}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <StarRating rating={captain.rating ?? 0} />
          <StatusBadge status={captain.approvalStatus ?? "pending"} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-[#22C55E] font-black text-2xl">{captain.totalTrips ?? 0}</p>
          <p className="text-gray-400 text-xs mt-1">Total Trips</p>
        </div>
        <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-white font-black text-2xl">{(captain.balance ?? 0).toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-1">Balance (JOD)</p>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4 space-y-2">
        <h3 className="text-white font-semibold mb-3">Account Status</h3>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Account</span>
          <span className={`text-sm font-medium ${captain.status === "active" ? "text-[#22C55E]" : "text-red-400"}`}>
            {captain.status.charAt(0).toUpperCase() + captain.status.slice(1)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Approval</span>
          <StatusBadge status={captain.approvalStatus ?? "pending"} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Availability</span>
          <span className={`text-sm font-medium ${captain.isOnline ? "text-[#22C55E]" : "text-gray-500"}`}>
            {captain.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Vehicle Info */}
      {(captain.vehicleMake || captain.vehicleModel || captain.vehiclePlate) && (
        <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-3">🚗 Vehicle</h3>
          <div className="space-y-2">
            {captain.vehicleMake && captain.vehicleModel && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Make / Model</span>
                <span className="text-white text-sm font-medium">
                  {captain.vehicleMake} {captain.vehicleModel}
                </span>
              </div>
            )}
            {captain.vehiclePlate && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Plate</span>
                <span className="text-white text-sm font-mono font-bold bg-white/10 px-2 py-0.5 rounded">
                  {captain.vehiclePlate}
                </span>
              </div>
            )}
            {captain.vehicleYear && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Year</span>
                <span className="text-white text-sm font-medium">{captain.vehicleYear}</span>
              </div>
            )}
            {captain.vehicleColor && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Color</span>
                <span className="text-white text-sm font-medium">{captain.vehicleColor}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* License */}
      {captain.licenseNumber && (
        <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-2">📋 License</h3>
          <p className="text-gray-300 text-sm font-mono">{captain.licenseNumber}</p>
        </div>
      )}

      {/* Member since */}
      <div className="text-center text-gray-600 text-xs pb-2">
        Captain since {new Date(captain.createdAt).toLocaleDateString("en-JO", { month: "long", year: "numeric" })}
      </div>
    </div>
  );
}
