import { Router } from "express";
import { db } from "@workspace/db";
import {
  tripsTable,
  captainsTable,
  usersTable,
  discountCodesTable,
  transactionsTable,
} from "@workspace/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import {
  RequestTripBody,
  EstimateFareBody,
  CompleteTripBody,
  CompleteTripParams,
  RateTripBody,
  RateTripParams,
  GetTripParams,
  CancelTripParams,
  AcceptTripParams,
  StartTripParams,
  GetTripTrackingParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { calculateFare, getCaptainByUserId } from "../lib/helpers";

const router = Router();

function formatTrip(trip: typeof tripsTable.$inferSelect, passenger?: any, captain?: any) {
  return { ...trip, passenger, captain };
}

// POST /api/trips/estimate
router.post("/trips/estimate", requireAuth, async (req, res) => {
  const parsed = EstimateFareBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { distanceKm, durationMin, discountCode } = parsed.data;
  const totalFare = calculateFare(distanceKm, durationMin);

  let discountPercent = 0;
  if (discountCode) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, discountCode));
    if (dc && dc.isActive && dc.currentUses < dc.maxUses && (!dc.expiresAt || dc.expiresAt > new Date())) {
      discountPercent = dc.discountPercent;
    }
  }

  const discountAmount = Math.round((totalFare * discountPercent / 100) * 100) / 100;
  const finalFare = Math.round((totalFare - discountAmount) * 100) / 100;

  // breakdown
  const baseFare = 1.0;
  const distanceFare = distanceKm > 2 ? Math.round((distanceKm - 2) * 0.25 * 100) / 100 : 0;
  const timeFare = distanceKm > 2 ? Math.round(durationMin * 0.05 * 100) / 100 : 0;

  res.json({ baseFare, distanceFare, timeFare, totalFare, discountAmount, finalFare, discountPercent: discountPercent || undefined });
});

// POST /api/trips
router.post("/trips", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") {
    res.status(403).json({ error: "Only passengers can request trips" });
    return;
  }
  const parsed = RequestTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // Check no active trip
  const [existing] = await db
    .select()
    .from(tripsTable)
    .where(and(
      eq(tripsTable.passengerId, req.userId!),
      or(eq(tripsTable.status, "pending"), eq(tripsTable.status, "accepted"), eq(tripsTable.status, "started"))
    ));
  if (existing) {
    res.status(409).json({ error: "You already have an active trip" });
    return;
  }

  let discountPercent = 0;
  const { discountCode, ...tripData } = parsed.data;

  if (discountCode) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, discountCode));
    if (dc && dc.isActive && dc.currentUses < dc.maxUses && (!dc.expiresAt || dc.expiresAt > new Date())) {
      discountPercent = dc.discountPercent;
      // increment usage
      await db.update(discountCodesTable).set({ currentUses: dc.currentUses + 1 }).where(eq(discountCodesTable.id, dc.id));
    }
  }

  const [trip] = await db.insert(tripsTable).values({
    passengerId: req.userId!,
    ...tripData,
    discountPercent: discountPercent || null,
    discountCodeUsed: discountCode,
    status: "pending",
  }).returning();

  const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json(formatTrip(trip, passenger ? { id: passenger.id, name: passenger.name, phone: passenger.phone, email: passenger.email, role: passenger.role, status: passenger.status, createdAt: passenger.createdAt } : undefined));
});

// GET /api/trips/active
router.get("/trips/active", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") {
    res.status(403).json({ error: "Passengers only" });
    return;
  }
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(
      eq(tripsTable.passengerId, req.userId!),
      or(eq(tripsTable.status, "pending"), eq(tripsTable.status, "accepted"), eq(tripsTable.status, "started"))
    ));
  if (!trip) {
    res.json(null);
    return;
  }
  res.json(trip);
});

// GET /api/trips/my
router.get("/trips/my", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") {
    res.status(403).json({ error: "Passengers only" });
    return;
  }
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.passengerId, req.userId!))
    .orderBy(desc(tripsTable.createdAt))
    .limit(50);
  res.json(trips);
});

// GET /api/trips/:id
router.get("/trips/:id", requireAuth, async (req, res) => {
  const parsed = GetTripParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parsed.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.json(trip);
});

// POST /api/trips/:id/cancel
router.post("/trips/:id/cancel", requireAuth, async (req, res) => {
  const parsed = CancelTripParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parsed.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  if (trip.passengerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (trip.status === "completed" || trip.status === "cancelled") {
    res.status(400).json({ error: "Cannot cancel this trip" });
    return;
  }
  const [updated] = await db.update(tripsTable).set({ status: "cancelled" }).where(eq(tripsTable.id, trip.id)).returning();
  res.json(updated);
});

// POST /api/trips/:id/accept
router.post("/trips/:id/accept", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Captains only" });
    return;
  }
  const parsed = AcceptTripParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }
  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData || !captainData.captain.isApproved) {
    res.status(403).json({ error: "Captain not approved" });
    return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parsed.data.id));
  if (!trip || trip.status !== "pending") {
    res.status(400).json({ error: "Trip not available" });
    return;
  }

  const [updated] = await db
    .update(tripsTable)
    .set({ status: "accepted", captainId: captainData.captain.id })
    .where(and(eq(tripsTable.id, trip.id), eq(tripsTable.status, "pending")))
    .returning();
  res.json(updated);
});

// POST /api/trips/:id/start
router.post("/trips/:id/start", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Captains only" });
    return;
  }
  const parsed = StartTripParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }
  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData) {
    res.status(403).json({ error: "Captain not found" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parsed.data.id));
  if (!trip || trip.status !== "accepted" || trip.captainId !== captainData.captain.id) {
    res.status(400).json({ error: "Cannot start this trip" });
    return;
  }
  const [updated] = await db
    .update(tripsTable)
    .set({ status: "started", startedAt: new Date() })
    .where(eq(tripsTable.id, trip.id))
    .returning();
  res.json(updated);
});

// POST /api/trips/:id/complete
router.post("/trips/:id/complete", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Captains only" });
    return;
  }
  const paramsParsed = CompleteTripParams.safeParse(req.params);
  const bodyParsed = CompleteTripBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData) {
    res.status(403).json({ error: "Captain not found" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, paramsParsed.data.id));
  if (!trip || trip.status !== "started" || trip.captainId !== captainData.captain.id) {
    res.status(400).json({ error: "Cannot complete this trip" });
    return;
  }

  const { distanceKm, durationMin } = bodyParsed.data;
  const fare = calculateFare(distanceKm, durationMin);
  const discountPercent = trip.discountPercent ?? 0;
  const discountAmount = fare * discountPercent / 100;
  const finalFare = Math.round((fare - discountAmount) * 100) / 100;

  // 10% commission
  const commission = Math.round(finalFare * 0.1 * 100) / 100;
  const earning = Math.round((finalFare - commission) * 100) / 100;

  const [updated] = await db
    .update(tripsTable)
    .set({
      status: "completed",
      distanceKm,
      durationMin,
      fare,
      finalFare,
      completedAt: new Date(),
    })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // Update captain balance & totalTrips
  await db.update(captainsTable).set({
    balance: captainData.captain.balance + earning,
    totalTrips: captainData.captain.totalTrips + 1,
  }).where(eq(captainsTable.id, captainData.captain.id));

  // Record transactions
  await db.insert(transactionsTable).values([
    { captainId: captainData.captain.id, tripId: trip.id, amount: earning, type: "trip_earning", note: `Trip #${trip.id} earnings` },
    { captainId: captainData.captain.id, tripId: trip.id, amount: -commission, type: "trip_commission", note: `10% commission on trip #${trip.id}` },
  ]);

  res.json(updated);
});

// POST /api/trips/:id/rate
router.post("/trips/:id/rate", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") {
    res.status(403).json({ error: "Passengers only" });
    return;
  }
  const paramsParsed = RateTripParams.safeParse(req.params);
  const bodyParsed = RateTripBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, paramsParsed.data.id));
  if (!trip || trip.status !== "completed" || trip.passengerId !== req.userId) {
    res.status(400).json({ error: "Cannot rate this trip" });
    return;
  }
  const [updated] = await db
    .update(tripsTable)
    .set({ rating: bodyParsed.data.rating })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // Update captain rating
  if (trip.captainId) {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.id, trip.captainId));
    if (captain) {
      // Simple running average
      const newTotalRatings = captain.totalTrips;
      const newRating = newTotalRatings > 0
        ? Math.round(((captain.rating * (newTotalRatings - 1) + bodyParsed.data.rating) / newTotalRatings) * 10) / 10
        : bodyParsed.data.rating;
      await db.update(captainsTable).set({ rating: newRating }).where(eq(captainsTable.id, captain.id));
    }
  }

  res.json(updated);
});

// GET /api/trips/:id/tracking
router.get("/trips/:id/tracking", requireAuth, async (req, res) => {
  const parsed = GetTripTrackingParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parsed.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  let captainLat = null;
  let captainLng = null;
  let updatedAt = new Date();
  if (trip.captainId) {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.id, trip.captainId));
    if (captain) {
      captainLat = captain.currentLat ?? null;
      captainLng = captain.currentLng ?? null;
      updatedAt = captain.locationUpdatedAt ?? new Date();
    }
  }
  res.json({ tripId: trip.id, captainLat, captainLng, updatedAt });
});

export default router;
