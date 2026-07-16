import { useState } from "react";
import {
  useGetAdminRoutes,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  Route as RouteType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";

interface RouteFormData {
  name: string;
  pickupArea: string;
  dropoffArea: string;
  description: string;
  isActive?: boolean;
}

interface RouteModalProps {
  initial?: RouteType;
  onClose: () => void;
}

function RouteModal({ initial, onClose }: RouteModalProps) {
  const [form, setForm] = useState<RouteFormData>({
    name: initial?.name ?? "",
    pickupArea: initial?.pickupArea ?? "",
    dropoffArea: initial?.dropoffArea ?? "",
    description: initial?.description ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/routes"] });

  const create = useCreateRoute({
    mutation: { onSuccess: () => { invalidate(); onClose(); }, onError: () => setError("Failed to create route.") },
  });

  const update = useUpdateRoute({
    mutation: { onSuccess: () => { invalidate(); onClose(); }, onError: () => setError("Failed to update route.") },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.pickupArea || !form.dropoffArea) { setError("Name, pickup, and dropoff are required."); return; }
    if (initial) {
      update.mutate({
        id: initial.id,
        data: {
          name: form.name,
          pickupArea: form.pickupArea,
          dropoffArea: form.dropoffArea,
          description: form.description || undefined,
          isActive: form.isActive,
        },
      });
    } else {
      create.mutate({
        data: {
          name: form.name,
          pickupArea: form.pickupArea,
          dropoffArea: form.dropoffArea,
          description: form.description || undefined,
        },
      });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-gray-900 mb-4">{initial ? "Edit Route" : "Add Route"}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Area</label>
            <input value={form.pickupArea} onChange={(e) => setForm({ ...form, pickupArea: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Area</label>
            <input value={form.dropoffArea} onChange={(e) => setForm({ ...form, dropoffArea: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
          </div>
          {initial && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Active
            </label>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isPending} className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: "#0F1B2D" }}>
              {isPending ? "Saving…" : initial ? "Update" : "Create"}
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

export default function RoutesPage() {
  const [modal, setModal] = useState<"add" | RouteType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteType | null>(null);
  const queryClient = useQueryClient();

  const { data: routes, isLoading } = useGetAdminRoutes();

  const deleteRoute = useDeleteRoute({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/routes"] });
        setDeleteTarget(null);
      },
    },
  });

  const updateRoute = useUpdateRoute({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/routes"] }),
    },
  });

  const toggleActive = (route: RouteType) => {
    updateRoute.mutate({ id: route.id, data: { isActive: !route.isActive } });
  };

  return (
    <Layout title="Routes">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">{routes?.length ?? 0} routes</span>
        <button
          onClick={() => setModal("add")}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#0F1B2D" }}
        >
          + Add Route
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup Area</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoff Area</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && (!routes || routes.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No routes found</td></tr>
              )}
              {(routes ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-700">{r.pickupArea}</td>
                  <td className="px-4 py-3 text-gray-700">{r.dropoffArea}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{r.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.isActive ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${r.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setModal(r)}
                        className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >Edit</button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <RouteModal
          initial={modal === "add" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete route "${deleteTarget.name}"? This cannot be undone.`}
          loading={deleteRoute.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteRoute.mutate({ id: deleteTarget.id })}
        />
      )}
    </Layout>
  );
}
