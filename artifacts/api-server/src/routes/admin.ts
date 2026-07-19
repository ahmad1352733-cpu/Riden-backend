import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, captainsTable, tripsTable, complaintsTable,
  routesTable, discountCodesTable, transactionsTable, settingsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql, count, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatCaptain, formatUser, invalidateSettingsCache } from "../lib/helpers";

const router = Router();

// Admin-only middleware
router.use(requireAuth, (req, res, next) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  next();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/admin/dashboard", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [passengersCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "passenger"));
  const [captainsCount] = await db.select({ count: count() }).from(captainsTable);
  const [pendingCaptains] = await db.select({ count: count() }).from(captainsTable).where(eq(captainsTable.approvalStatus, "pending"));
  const [totalTripsRow] = await db.select({ count: count() }).from(tripsTable);
  const [completedTripsRow] = await db.select({ count: count() }).from(tripsTable).where(eq(tripsTable.status, "completed"));
  const [cancelledTripsRow] = await db.select({ count: count() }).from(tripsTable).where(eq(tripsTable.status, "cancelled"));

  const allActiveTrips = await db.select({ count: count() }).from(tripsTable).where(
    sql`${tripsTable.status} IN ('pending','accepted','started')`
  );

  const revenueRows = await db.select({ fare: tripsTable.finalFare }).from(tripsTable).where(eq(tripsTable.status, "completed"));
  const totalRevenue = revenueRows.reduce((s, t) => s + (t.fare ?? 0), 0);

  const todayTrips = await db.select().from(tripsTable).where(sql`${tripsTable.createdAt} >= ${today}`);
  const todayRevenue = todayTrips.filter(t => t.status === "completed").reduce((s, t) => s + (t.finalFare ?? 0), 0);

  const [openComplaintsRow] = await db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "open"));
  const recentTrips = await db.select().from(tripsTable).orderBy(desc(tripsTable.createdAt)).limit(10);

  res.json({
    totalPassengers: Number(passengersCount.count),
    totalCaptains: Number(captainsCount.count),
    pendingCaptains: Number(pendingCaptains.count),
    totalTrips: Number(totalTripsRow.count),
    activeTrips: Number(allActiveTrips[0]?.count ?? 0),
    completedTrips: Number(completedTripsRow.count),
    cancelledTrips: Number(cancelledTripsRow.count),
    todayTrips: todayTrips.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    openComplaints: Number(openComplaintsRow.count),
    recentTrips,
  });
});

// ─── Captains ─────────────────────────────────────────────────────────────────
router.get("/admin/captains", async (req, res) => {
  const rows = await db.select().from(captainsTable)
    .innerJoin(usersTable, eq(captainsTable.userId, usersTable.id))
    .orderBy(desc(captainsTable.createdAt));
  res.json(rows.map(r => formatCaptain(r.users, r.captains)));
});

router.patch("/admin/captains/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  const { approved, reason } = req.body;
  if (typeof approved !== "boolean") { res.status(400).json({ error: "approved required" }); return; }
  // id here is the user.id (returned by formatCaptain), so look up by userId
  const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.userId, id));
  if (!captain) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(captainsTable).set({
    isApproved: approved,
    approvalStatus: approved ? "approved" : "rejected",
  }).where(eq(captainsTable.userId, id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json(formatCaptain(user, updated));
});

router.post("/admin/captains/:id/credit", async (req, res) => {
  const id = parseInt(req.params.id);
  const { amount, note } = req.body;
  if (typeof amount !== "number" || amount <= 0) { res.status(400).json({ error: "amount must be > 0" }); return; }
  // id here is the user.id (returned by formatCaptain), so look up by userId
  const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.userId, id));
  if (!captain) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(captainsTable).set({ balance: captain.balance + amount }).where(eq(captainsTable.userId, id)).returning();
  await db.insert(transactionsTable).values({
    captainId: captain.id,
    amount,
    type: "admin_credit",
    note: note ?? `إضافة رصيد من الإدارة - ${amount} د.أ`,
  });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));
  res.json(formatCaptain(user, updated));
});

// ─── Passengers ───────────────────────────────────────────────────────────────
router.get("/admin/passengers", async (req, res) => {
  const users = await db.select().from(usersTable).where(eq(usersTable.role, "passenger")).orderBy(desc(usersTable.createdAt));
  res.json(users.map(formatUser));
});

router.patch("/admin/passengers/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db.update(usersTable).set({ status }).where(eq(usersTable.id, id)).returning();
  res.json(formatUser(updated));
});

// ─── Trips ────────────────────────────────────────────────────────────────────
router.get("/admin/trips", async (req, res) => {
  const { status, limit } = req.query;
  let query = db.select().from(tripsTable).orderBy(desc(tripsTable.createdAt));
  if (status) {
    const trips = await db.select().from(tripsTable)
      .where(eq(tripsTable.status, status as any))
      .orderBy(desc(tripsTable.createdAt))
      .limit(Number(limit) || 100);
    res.json(trips); return;
  }
  const trips = await db.select().from(tripsTable).orderBy(desc(tripsTable.createdAt)).limit(Number(limit) || 100);
  res.json(trips);
});

// ─── Complaints ───────────────────────────────────────────────────────────────
router.get("/admin/complaints", async (req, res) => {
  const complaints = await db.select().from(complaintsTable)
    .innerJoin(usersTable, eq(complaintsTable.userId, usersTable.id))
    .orderBy(desc(complaintsTable.createdAt))
    .limit(100);
  res.json(complaints.map(r => ({ ...r.complaints, user: formatUser(r.users) })));
});

router.patch("/admin/complaints/:id/resolve", async (req, res) => {
  const id = parseInt(req.params.id);
  const { adminNote } = req.body;
  const [updated] = await db.update(complaintsTable).set({
    status: "resolved",
    adminNote: adminNote ?? "",
    resolvedAt: new Date(),
  }).where(eq(complaintsTable.id, id)).returning();
  res.json(updated);
});

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get("/admin/routes", async (req, res) => {
  const routes = await db.select().from(routesTable).orderBy(desc(routesTable.createdAt));
  res.json(routes);
});

router.post("/admin/routes", async (req, res) => {
  const { name, pickupArea, dropoffArea, description } = req.body;
  if (!name || !pickupArea || !dropoffArea) { res.status(400).json({ error: "name, pickupArea, dropoffArea required" }); return; }
  const [route] = await db.insert(routesTable).values({ name, pickupArea, dropoffArea, description, isActive: true }).returning();
  res.status(201).json(route);
});

router.patch("/admin/routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, pickupArea, dropoffArea, description, isActive } = req.body;
  const [updated] = await db.update(routesTable).set({ name, pickupArea, dropoffArea, description, isActive }).where(eq(routesTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(routesTable).where(eq(routesTable.id, id));
  res.status(204).end();
});

// ─── Discount Codes ───────────────────────────────────────────────────────────
router.get("/admin/discount-codes", async (req, res) => {
  const codes = await db.select().from(discountCodesTable).orderBy(desc(discountCodesTable.createdAt));
  res.json(codes);
});

router.post("/admin/discount-codes", async (req, res) => {
  const { code, discountPercent, maxUses, expiresAt } = req.body;
  if (!code || !discountPercent || !maxUses) { res.status(400).json({ error: "code, discountPercent, maxUses required" }); return; }
  const [dc] = await db.insert(discountCodesTable).values({
    code: code.toUpperCase(),
    discountPercent,
    maxUses,
    currentUses: 0,
    isActive: true,
    expiresAt: expiresAt && expiresAt !== '' ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(dc);
});

router.delete("/admin/discount-codes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
  res.status(204).end();
});

// ─── Settings (Pricing) ───────────────────────────────────────────────────────
router.get("/admin/settings", async (req, res) => {
  const rows = await db.select().from(settingsTable);
  const settings = Object.fromEntries(rows.map(r => [r.key, parseFloat(r.value)]));
  res.json(settings);
});

router.patch("/admin/settings", async (req, res) => {
  const { base_fare, per_km_rate, per_min_rate, free_km, commission_rate } = req.body;
  const updates: Array<[string, string]> = [];
  if (base_fare !== undefined) updates.push(["base_fare", String(base_fare)]);
  if (per_km_rate !== undefined) updates.push(["per_km_rate", String(per_km_rate)]);
  if (per_min_rate !== undefined) updates.push(["per_min_rate", String(per_min_rate)]);
  if (free_km !== undefined) updates.push(["free_km", String(free_km)]);
  if (commission_rate !== undefined) updates.push(["commission_rate", String(commission_rate)]);

  for (const [key, value] of updates) {
    await db.insert(settingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
  }

  invalidateSettingsCache();

  const rows = await db.select().from(settingsTable);
  res.json(Object.fromEntries(rows.map(r => [r.key, parseFloat(r.value)])));
});

export default router;
