import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  captainsTable, usersTable, tripsTable, transactionsTable, tripRequestsTable,
} from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth, signToken } from "../lib/auth";
import { formatCaptain, getCaptainByUserId, formatUser } from "../lib/helpers";
import { RegisterCaptainBody } from "@workspace/api-zod";

const router = Router();

// POST /api/captains/register  (alias used by the mobile app)
router.post("/captains/register", async (req, res) => {
  const parsed = RegisterCaptainBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, phone, email, password, licenseNumber, vehicleMake, vehicleModel, vehiclePlate, vehicleYear, vehicleColor } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, phone, email, passwordHash, role: "captain" }).returning();
  const [captain] = await db.insert(captainsTable).values({
    userId: user.id,
    licenseNumber,
    vehicleMake,
    vehicleModel,
    vehiclePlate,
    vehicleYear,
    vehicleColor,
  }).returning();

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: formatCaptain(user, captain) });
});

// GET /api/captains/me
router.get("/captains/me", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Captain not found" }); return; }
  res.json(formatCaptain(data.user, data.captain));
});

// PUT /api/captains/me/availability
router.put("/captains/me/availability", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const { isOnline } = req.body;
  if (typeof isOnline !== "boolean") { res.status(400).json({ error: "isOnline required" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Captain not found" }); return; }
  if (!data.captain.isApproved) { res.status(403).json({ error: "Captain not approved yet" }); return; }
  const [updated] = await db
    .update(captainsTable)
    .set({ isOnline })
    .where(eq(captainsTable.id, data.captain.id))
    .returning();
  res.json(formatCaptain(data.user, updated));
});

// PUT /api/captains/me/location
router.put("/captains/me/location", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng required" }); return;
  }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(captainsTable).set({
    currentLat: lat, currentLng: lng, locationUpdatedAt: new Date(),
  }).where(eq(captainsTable.id, data.captain.id));
  res.json({ success: true });
});

// GET /api/captains/me/trips
router.get("/captains/me/trips", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Not found" }); return; }
  const trips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.captainId, data.captain.id))
    .orderBy(desc(tripsTable.createdAt))
    .limit(50);
  // Enrich with passenger
  const enriched = await Promise.all(trips.map(async t => {
    const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, t.passengerId));
    return { ...t, passenger: passenger ? formatUser(passenger) : null };
  }));
  res.json(enriched);
});

// GET /api/captains/me/earnings
router.get("/captains/me/earnings", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Not found" }); return; }

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
// Only returns trips where THIS captain was notified (trip_requests)
router.get("/captains/me/pending-trip", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data || !data.captain.isApproved || !data.captain.isOnline) {
    res.json(null); return;
  }

  // Find pending trips assigned to this captain
  const rows = await db
    .select({ trip: tripsTable })
    .from(tripRequestsTable)
    .innerJoin(tripsTable, eq(tripRequestsTable.tripId, tripsTable.id))
    .where(and(
      eq(tripRequestsTable.captainId, data.captain.id),
      eq(tripsTable.status, "pending"),
    ))
    .orderBy(tripsTable.createdAt)
    .limit(1);

  if (rows.length === 0) { res.json(null); return; }

  const trip = rows[0].trip;
  const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, trip.passengerId));
  res.json({ ...trip, passenger: passenger ? formatUser(passenger) : null });
});

// GET /api/captains/me/active-trip
// Captain's currently accepted/started trip
router.get("/captains/me/active-trip", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.json(null); return; }

  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(
      eq(tripsTable.captainId, data.captain.id),
      // accepted or started
      ...([] as any[]),
    ))
    .orderBy(desc(tripsTable.createdAt))
    .limit(1);

  // Manual filter since Drizzle OR with status needs workaround
  const activeTrips = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.captainId, data.captain.id))
    .orderBy(desc(tripsTable.createdAt))
    .limit(10);

  const active = activeTrips.find(t => t.status === "accepted" || t.status === "started");
  if (!active) { res.json(null); return; }

  const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, active.passengerId));
  res.json({ ...active, passenger: passenger ? formatUser(passenger) : null });
});

// GET /api/captains/me/transactions
router.get("/captains/me/transactions", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Forbidden" }); return; }
  const data = await getCaptainByUserId(req.userId!);
  if (!data) { res.status(404).json({ error: "Not found" }); return; }
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.captainId, data.captain.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);
  res.json(txns);
});

export default router;
