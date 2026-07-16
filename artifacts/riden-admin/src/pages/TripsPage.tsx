import { useState } from "react";
import { useGetAdminTrips } from "@workspace/api-client-react";
import { Layout } from "../components/Layout";

type TripStatus = "all" | "pending" | "accepted" | "started" | "completed" | "cancelled";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    started: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

const statusOptions: TripStatus[] = ["all", "pending", "accepted", "started", "completed", "cancelled"];

export default function TripsPage() {
  const [status, setStatus] = useState<TripStatus>("all");

  const { data: trips, isLoading } = useGetAdminTrips(
    status === "all" ? { limit: 100 } : { status, limit: 100 }
  );

  return (
    <Layout title="Trips">
      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TripStatus)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{trips?.length ?? 0} trips</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Captain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && (!trips || trips.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No trips found</td></tr>
              )}
              {(trips ?? []).map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">#{t.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.passenger?.name ?? `#${t.passengerId}`}</p>
                    <p className="text-xs text-gray-500">{t.passenger?.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.captain?.name ?? (t.captainId ? `#${t.captainId}` : "—")}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 text-xs max-w-[200px]">
                      <span className="truncate block">{t.pickupAddress}</span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate block">{t.dropoffAddress}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.finalFare != null
                      ? `${t.finalFare.toFixed(2)} JOD`
                      : t.fare != null
                      ? `${t.fare.toFixed(2)} JOD`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
