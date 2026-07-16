import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Layout } from "../components/Layout";

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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useGetAdminDashboard({
    query: { refetchInterval: 30000 } as any,
  });

  if (isLoading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard…</div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout title="Dashboard">
        <div className="text-red-600 bg-red-50 rounded-lg p-4">Failed to load dashboard data.</div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Passengers" value={data.totalPassengers} />
        <StatCard label="Total Captains" value={data.totalCaptains} />
        <StatCard label="Pending Approvals" value={data.pendingCaptains} />
        <StatCard label="Open Complaints" value={data.openComplaints} />
        <StatCard label="Total Trips" value={data.totalTrips} />
        <StatCard label="Completed Trips" value={data.completedTrips} />
        <StatCard label="Today's Trips" value={data.todayTrips} />
        <StatCard label="Today's Revenue" value={`${data.todayRevenue?.toFixed(2) ?? "0.00"} JOD`} />
      </div>

      {/* Recent Trips */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Trips</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data.recentTrips ?? []).slice(0, 10).map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">#{trip.id}</td>
                  <td className="px-4 py-3"><StatusBadge status={trip.status} /></td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{trip.pickupAddress}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{trip.dropoffAddress}</td>
                  <td className="px-4 py-3 text-gray-700">{trip.finalFare != null ? `${trip.finalFare.toFixed(2)} JOD` : trip.fare != null ? `${trip.fare.toFixed(2)} JOD` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(trip.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!data.recentTrips || data.recentTrips.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No recent trips</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
