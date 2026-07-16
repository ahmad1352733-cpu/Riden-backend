import { useState } from "react";
import { useGetMyComplaints, useSubmitComplaint } from "@workspace/api-client-react";
import type { Complaint } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const COMPLAINT_TYPES = [
  { value: "driver_behavior", label: "Driver Behavior" },
  { value: "app_issue", label: "App Issue" },
  { value: "payment", label: "Payment" },
  { value: "route", label: "Route" },
  { value: "other", label: "Other" },
] as const;

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const typeLabel = COMPLAINT_TYPES.find((t) => t.value === complaint.type)?.label || complaint.type;
  const date = new Date(complaint.createdAt);
  const isResolved = complaint.status === "resolved";

  return (
    <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-gray-500 text-xs mb-1">
            #{complaint.id} · {date.toLocaleDateString("en-JO", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <span className="text-[#F5A623] text-xs font-semibold bg-[#F5A623]/10 px-2 py-0.5 rounded-full">
            {typeLabel}
          </span>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isResolved
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {isResolved ? "Resolved" : "Open"}
        </span>
      </div>
      {complaint.tripId && (
        <p className="text-gray-500 text-xs mb-2">Trip #{complaint.tripId}</p>
      )}
      <p className="text-gray-300 text-sm">{complaint.description}</p>
      {complaint.adminNote && (
        <div className="mt-3 bg-[#0F1B2D] rounded-xl p-3 border border-[#2A3F5A]">
          <p className="text-gray-500 text-xs mb-1">Admin Response</p>
          <p className="text-gray-300 text-sm">{complaint.adminNote}</p>
        </div>
      )}
    </div>
  );
}

export default function ComplaintsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tripId: "",
    type: "driver_behavior" as typeof COMPLAINT_TYPES[number]["value"],
    description: "",
  });

  const { data: complaints, isLoading } = useGetMyComplaints();

  const submitMutation = useSubmitComplaint({
    mutation: {
      onSuccess: () => {
        toast({ title: "✅ Complaint submitted", description: "We'll review it shortly" });
        setForm({ tripId: "", type: "driver_behavior", description: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/complaints/my"] });
      },
      onError: (err: any) => {
        toast({
          title: "Error",
          description: err?.response?.data?.error || "Could not submit complaint",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      data: {
        ...(form.tripId ? { tripId: parseInt(form.tripId) } : {}),
        type: form.type,
        description: form.description,
      },
    });
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Complaints</h1>
        <p className="text-gray-400 text-sm mt-0.5">Report an issue or concern</p>
      </div>

      {/* Complaint Form */}
      <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
        <h2 className="text-white font-bold text-base mb-4">Submit a Complaint</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Trip ID (optional)</label>
            <input
              type="number"
              value={form.tripId}
              onChange={(e) => setForm((p) => ({ ...p, tripId: e.target.value }))}
              placeholder="e.g. 42"
              className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600 text-sm"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Issue Type</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  type: e.target.value as typeof COMPLAINT_TYPES[number]["value"],
                }))
              }
              className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors text-sm appearance-none"
            >
              {COMPLAINT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe the issue in detail (at least 10 characters)..."
              required
              minLength={10}
              rows={4}
              className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600 text-sm resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full bg-[#F5A623] text-[#0F1B2D] font-bold py-3 rounded-xl hover:bg-[#e8961a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>
      </div>

      {/* My Complaints */}
      <div>
        <h2 className="text-white font-bold text-base mb-3">My Complaints</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#1A2D44] rounded-2xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : !complaints || complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[#1A2D44] rounded-2xl">
            <span className="text-5xl mb-3">⚠️</span>
            <p className="text-white font-semibold">No complaints yet</p>
            <p className="text-gray-400 text-sm mt-1">Use the form above to report an issue</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => (
              <ComplaintCard key={complaint.id} complaint={complaint} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
