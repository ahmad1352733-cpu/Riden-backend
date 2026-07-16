import { useState } from "react";
import {
  useGetAdminComplaints,
  useResolveComplaint,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";

type FilterStatus = "all" | "open" | "resolved";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-orange-100 text-orange-800",
    resolved: "bg-green-100 text-green-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

interface ResolveDialogProps {
  complaintId: number;
  onClose: () => void;
}

function ResolveDialog({ complaintId, onClose }: ResolveDialogProps) {
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const resolve = useResolveComplaint({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
        onClose();
      },
      onError: () => setError("Failed to resolve complaint."),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNote.trim()) { setError("Please add an admin note."); return; }
    resolve.mutate({ id: complaintId, data: { adminNote } });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Resolve Complaint #{complaintId}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Describe the resolution..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={resolve.isPending} className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
              {resolve.isPending ? "Resolving…" : "Resolve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [resolveId, setResolveId] = useState<number | null>(null);

  const { data: complaints, isLoading } = useGetAdminComplaints();

  const filtered = (complaints ?? []).filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const tabs: FilterStatus[] = ["all", "open", "resolved"];

  return (
    <Layout title="Complaints">
      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === tab ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No complaints found</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.user?.name ?? `User #${c.userId}`}</p>
                    <p className="text-xs text-gray-500">{c.user?.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{c.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[220px]">
                    <span className="line-clamp-2 text-xs">{c.description}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {c.status === "open" ? (
                      <button
                        onClick={() => setResolveId(c.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                      >Resolve</button>
                    ) : (
                      <span className="text-xs text-gray-400">{c.adminNote ? `"${c.adminNote.slice(0, 30)}…"` : "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resolveId !== null && (
        <ResolveDialog complaintId={resolveId} onClose={() => setResolveId(null)} />
      )}
    </Layout>
  );
}
