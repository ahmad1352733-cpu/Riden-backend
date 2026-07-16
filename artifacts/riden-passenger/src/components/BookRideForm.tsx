import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useEstimateFare,
  useRequestTrip,
  useValidateDiscountCode,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function BookRideForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");

  const estimateFareMutation = useEstimateFare();
  const validateCodeMutation = useValidateDiscountCode();
  const requestTripMutation = useRequestTrip({
    mutation: {
      onSuccess: () => {
        toast({ title: "🚗 Ride requested!", description: "Looking for a captain nearby..." });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({
          title: "Failed to book ride",
          description: err?.response?.data?.error || "Something went wrong",
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    estimateFareMutation.mutate({
      data: { distanceKm: 5, durationMin: 15 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fareEstimate = estimateFareMutation.data;

  const handleApplyCode = () => {
    if (!discountCode.trim()) return;
    validateCodeMutation.mutate(
      { data: { code: discountCode.trim() } },
      {
        onSuccess: (data) => {
          setAppliedCode(discountCode.trim());
          toast({
            title: "✅ Code applied!",
            description: `${data.discountPercent}% discount activated`,
          });
          estimateFareMutation.mutate({
            data: { distanceKm: 5, durationMin: 15, discountCode: discountCode.trim() },
          });
        },
        onError: () => {
          toast({ title: "Invalid code", description: "This discount code is not valid", variant: "destructive" });
        },
      }
    );
  };

  const handleBookNow = () => {
    if (!pickup.trim() || !dropoff.trim()) {
      toast({ title: "Missing info", description: "Please enter pickup and dropoff addresses", variant: "destructive" });
      return;
    }
    requestTripMutation.mutate({
      data: {
        pickupLat: 31.9539,
        pickupLng: 35.9106,
        pickupAddress: pickup,
        dropoffLat: 31.9600,
        dropoffLng: 35.9200,
        dropoffAddress: dropoff,
        ...(appliedCode ? { discountCode: appliedCode } : {}),
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Address Inputs */}
      <div className="bg-[#1A2D44] rounded-2xl p-5 space-y-4 shadow-lg">
        <h2 className="text-white font-bold text-lg">Book a Ride</h2>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#F5A623]" />
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Pickup address"
            className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600 text-sm"
          />
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500" />
          <input
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Dropoff address"
            className="w-full bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600 text-sm"
          />
        </div>
      </div>

      {/* Discount Code */}
      <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
        <h3 className="text-gray-300 font-semibold text-sm mb-3">Discount Code</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="Enter code"
            className="flex-1 bg-[#0F1B2D] border border-[#2A3F5A] text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#F5A623] transition-colors placeholder-gray-600 text-sm"
          />
          <button
            onClick={handleApplyCode}
            disabled={validateCodeMutation.isPending || !discountCode.trim()}
            className="bg-[#F5A623] text-[#0F1B2D] font-bold px-4 py-2.5 rounded-xl hover:bg-[#e8961a] transition-colors disabled:opacity-50 text-sm"
          >
            {validateCodeMutation.isPending ? "..." : "Apply"}
          </button>
        </div>
        {appliedCode && (
          <p className="text-green-400 text-xs mt-2">✓ Code "{appliedCode}" applied</p>
        )}
      </div>

      {/* Fare Estimate */}
      <div className="bg-[#1A2D44] rounded-2xl p-5 shadow-lg">
        <h3 className="text-gray-300 font-semibold text-sm mb-3">Fare Estimate</h3>
        {estimateFareMutation.isPending ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
            Calculating...
          </div>
        ) : fareEstimate ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Base Fare</span>
              <span className="text-white font-medium">{fareEstimate.baseFare.toFixed(2)} JOD</span>
            </div>
            {fareEstimate.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Discount</span>
                <span className="text-green-400 font-medium">-{fareEstimate.discountAmount.toFixed(2)} JOD</span>
              </div>
            )}
            <div className="border-t border-[#2A3F5A] pt-2 flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-[#F5A623] font-black text-lg">{fareEstimate.finalFare.toFixed(2)} JOD</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Could not load estimate</p>
        )}
      </div>

      {/* Book Button */}
      <button
        onClick={handleBookNow}
        disabled={requestTripMutation.isPending}
        className="w-full bg-[#F5A623] text-[#0F1B2D] font-black py-4 rounded-2xl text-lg hover:bg-[#e8961a] transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {requestTripMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-[#0F1B2D] border-t-transparent rounded-full animate-spin" />
            Booking...
          </span>
        ) : (
          "Book Now 🚗"
        )}
      </button>
    </div>
  );
}
