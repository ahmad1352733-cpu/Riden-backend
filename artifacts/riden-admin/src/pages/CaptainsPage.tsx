import { useState } from "react";
import {
  useGetAdminCaptains,
  useApproveCaptain,
  useCreditCaptain,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";

type FilterTab = "all" | "pending" | "approved" | "rejected";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

interface CreditModalProps {
  captainId: number;
  captainName: string;
  onClose: () => void;
}

function CreditModal({ captainId, captainName, onClose }: CreditModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const credit = useCreditCaptain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/captains"] });
        onClose();
      },
      onError: () => setError("Failed to credit captain."),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }
    credit.mutate({ id: captainId, data: { amount: amt, note: note || undefined } });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Credit Captain — {captainName}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (JOD)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for credit"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={credit.isPending} className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
              {credit.isPending ? "Crediting…" : "Credit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <p className="text-gray-800 mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaptainsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [creditModal, setCreditModal] = useState<{ id: number; name: string } | null>(null);
  const [approveDialog, setApproveDialog] = useState<{ id: number; name: string; approve: boolean } | null>(null);

  const { data: captains, isLoading } = useGetAdminCaptains();
  const queryClient = useQueryClient();

  const approve = useApproveCaptain({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/captains"] });
        setApproveDialog(null);
      },
    },
  });

  const filtered = (captains ?? []).filter((c) => {
    if (filter === "all") return true;
    return c.approvalStatus === filter;
  });

  const tabs: FilterTab[] = ["all", "pending", "approved", "rejected"];

  return (
    <Layout title="Captains">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No captains found</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.phone}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{[c.vehicleMake, c.vehicleModel].filter(Boolean).join(" ") || "—"}</p>
                    <p className="text-xs text-gray-500">{c.vehiclePlate ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.balance?.toFixed(2) ?? "0.00"} JOD</td>
                  <td className="px-4 py-3 text-gray-700">⭐ {c.rating?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.approvalStatus ?? "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.approvalStatus === "pending" && (
                        <>
                          <button
                            onClick={() => setApproveDialog({ id: c.id, name: c.name, approve: true })}
                            className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                          >Approve</button>
                          <button
                            onClick={() => setApproveDialog({ id: c.id, name: c.name, approve: false })}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                          >Reject</button>
                        </>
                      )}
                      <button
                        onClick={() => setCreditModal({ id: c.id, name: c.name })}
                        className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >Credit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creditModal && (
        <CreditModal
          captainId={creditModal.id}
          captainName={creditModal.name}
          onClose={() => setCreditModal(null)}
        />
      )}

      {approveDialog && (
        <ConfirmDialog
          message={`Are you sure you want to ${approveDialog.approve ? "approve" : "reject"} ${approveDialog.name}?`}
          loading={approve.isPending}
          onCancel={() => setApproveDialog(null)}
          onConfirm={() =>
            approve.mutate({
              id: approveDialog.id,
              data: { approved: approveDialog.approve },
            })
          }
        />
      )}
    </Layout>
  );
}
