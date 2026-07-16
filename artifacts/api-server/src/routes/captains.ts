import { Router } from "express";
import { db } from "@workspace/db";
import { captainsTable, usersTable, tripsTable, transactionsTable } from "@workspace/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  UpdateCaptainAvailabilityBody,
  UpdateCaptainLocationBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { formatCaptain, getCaptainByUserId } from "../lib/helpers";

const router = Router();

// GET /api/captains/me
router.get("/captains/me", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }
  res.json(formatCaptain(data.user, data.captain));
});

// PUT /api/captains/me/availability
router.put("/captains/me/availability", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = UpdateCaptainAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }
  if (!data.captain.isApproved) {
    res.status(403).json({ error: "Captain not approved yet" });
    return;
  }
  const [updated] = await db
    .update(captainsTable)
    .set({ isOnline: parsed.data.isOnline })
    .where(eq(captainsTable.id, data.captain.id))
    .returning();
  res.json(formatCaptain(data.user, updated));
});

// PUT /api/captains/me/location
router.put("/captains/me/location", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = UpdateCaptainLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }
  await db
    .update(captainsTable)
    .set({ currentLat: parsed.data.lat, currentLng: parsed.data.lng, locationUpdatedAt: new Date() })
    .where(eq(captainsTable.id, data.captain.id));
  res.json({ success: true });
});

// GET /api/captains/me/trips
router.get("/captains/me/trips", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.captainId, data.captain.id))
    .orderBy(desc(tripsTable.createdAt))
    .limit(50);
  res.json(trips);
});

// GET /api/captains/me/earnings
router.get("/captains/me/earnings", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }

  const captainId = data.captain.id;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allEarnings = await db
    .select({ amount: transactionsTable.amount, createdAt: transactionsTable.createdAt, type: transactionsTable.type })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.captainId, captainId), eq(transactionsTable.type, "trip_earning")));

  const total = allEarnings.reduce((s, t) => s + t.amount, 0);
  const today = allEarnings.filter(t => t.createdAt >= startOfDay).reduce((s, t) => s + t.amount, 0);
  const week = allEarnings.filter(t => t.createdAt >= startOfWeek).reduce((s, t) => s + t.amount, 0);
  const month = allEarnings.filter(t => t.createdAt >= startOfMonth).reduce((s, t) => s + t.amount, 0);

  res.json({
    totalEarnings: Math.round(total * 100) / 100,
    todayEarnings: Math.round(today * 100) / 100,
    weekEarnings: Math.round(week * 100) / 100,
    monthEarnings: Math.round(month * 100) / 100,
    totalTrips: data.captain.totalTrips,
    balance: data.captain.balance,
    commissionRate: 0.1,
  });
});

// GET /api/captains/me/pending-trip
router.get("/captains/me/pending-trip", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data || !data.captain.isApproved || !data.captain.isOnline) {
    res.json(null);
    return;
  }

  // Get the oldest pending trip (not yet accepted)
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.status, "pending"))
    .orderBy(tripsTable.createdAt)
    .limit(1);

  if (!trip) {
    res.json(null);
    return;
  }

  // Include passenger info
  const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, trip.passengerId));
  res.json({ ...trip, passenger: passenger ? { id: passenger.id, name: passenger.name, phone: passenger.phone, email: passenger.email, role: passenger.role, status: passenger.status, createdAt: passenger.createdAt } : undefined });
});

// GET /api/captains/me/transactions
router.get("/captains/me/transactions", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.captainId, data.captain.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);
  res.json(txns);
});

export default router;
