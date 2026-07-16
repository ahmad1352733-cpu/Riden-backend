import { useState } from "react";
import {
  useGetAdminDiscountCodes,
  useCreateDiscountCode,
  useDeleteDiscountCode,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";

interface CreateModalProps {
  onClose: () => void;
}

function CreateModal({ onClose }: CreateModalProps) {
  const [form, setForm] = useState({
    code: "",
    discountPercent: "",
    maxUses: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateDiscountCode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
        onClose();
      },
      onError: () => setError("Failed to create discount code."),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseInt(form.discountPercent);
    const max = parseInt(form.maxUses);
    if (!form.code || isNaN(pct) || isNaN(max)) {
      setError("Code, discount %, and max uses are required.");
      return;
    }
    create.mutate({
      data: {
        code: form.code.toUpperCase(),
        discountPercent: pct,
        maxUses: max,
        expiresAt: form.expiresAt || undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-gray-900 mb-4">Create Discount Code</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER20"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#0F1B2D" }}>
              {create.isPending ? "Creating…" : "Create"}
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
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountCodesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: codes, isLoading } = useGetAdminDiscountCodes();

  const deleteCode = useDeleteDiscountCode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
        setDeleteTarget(null);
      },
    },
  });

  return (
    <Layout title="Discount Codes">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">{codes?.length ?? 0} codes</span>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#0F1B2D" }}
        >
          + Create Code
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Uses</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && (!codes || codes.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No discount codes found</td></tr>
              )}
              {(codes ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.discountPercent}%</td>
                  <td className="px-4 py-3 text-gray-700">{c.maxUses}</td>
                  <td className="px-4 py-3 text-gray-700">{c.currentUses}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteTarget(c.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}

      {deleteTarget !== null && (
        <ConfirmDialog
          message="Are you sure you want to delete this discount code?"
          loading={deleteCode.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteCode.mutate({ id: deleteTarget })}
        />
      )}
    </Layout>
  );
}
