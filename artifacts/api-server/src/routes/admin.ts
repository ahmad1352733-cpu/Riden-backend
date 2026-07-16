import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  captainsTable,
  tripsTable,
  complaintsTable,
  routesTable,
  discountCodesTable,
  transactionsTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import {
  ApproveCaptainBody,
  ApproveCaptainParams,
  CreditCaptainBody,
  CreditCaptainParams,
  GetAdminTripsQueryParams,
  ResolveComplaintBody,
  ResolveComplaintParams,
  CreateRouteBody,
  UpdateRouteBody,
  UpdateRouteParams,
  DeleteRouteParams,
  CreateDiscountCodeBody,
  DeleteDiscountCodeParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { formatCaptain, formatUser } from "../lib/helpers";

const router = Router();

// Middleware: admin only
router.use(requireAuth, (req, res, next) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
});

// GET /api/admin/dashboard
router.get("/admin/dashboard", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [passengersCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "passenger"));
  const [captainsCount] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "captain"));
  const pendingCaptains = await db.select().from(captainsTable).where(eq(captainsTable.approvalStatus, "pending"));
  const [totalTripsRow] = await db.select({ count: count() }).from(tripsTable);
  const [completedTripsRow] = await db.select({ count: count() }).from(tripsTable).where(eq(tripsTable.status, "completed"));
  const [cancelledTripsRow] = await db.select({ count: count() }).from(tripsTable).where(eq(tripsTable.status, "cancelled"));

  const activeTrips = await db.select({ count: count() }).from(tripsTable).where(
    and(eq(tripsTable.status, "pending"))
  );

  const revenueRows = await db.select({ fare: tripsTable.finalFare }).from(tripsTable).where(eq(tripsTable.status, "completed"));
  const totalRevenue = revenueRows.reduce((s, t) => s + (t.fare ?? 0), 0);

  const todayTrips = await db.select().from(tripsTable).where(sql`${tripsTable.createdAt} >= ${today}`);
  const todayRevenue = todayTrips
    .filter(t => t.status === "completed")
    .reduce((s, t) => s + (t.finalFare ?? 0), 0);

  const [openComplaintsRow] = await db.select({ count: count() }).from(complaintsTable).where(eq(complaintsTable.status, "open"));

  const recentTrips = await db.select().from(tripsTable).orderBy(desc(tripsTable.createdAt)).limit(10);

  res.json({
    totalPassengers: Number(passengersCount.count),
    totalCaptains: Number(captainsCount.count),
    pendingCaptains: pendingCaptains.length,
    totalTrips: Number(totalTripsRow.count),
    activeTrips: activeTrips.length,
    completedTrips: Number(completedTripsRow.count),
    cancelledTrips: Number(cancelledTripsRow.count),
    todayTrips: todayTrips.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    openComplaints: Number(openComplaintsRow.count),
    recentTrips,
  });
});

// GET /api/admin/captains
router.get("/admin/captains", async (req, res) => {
  const rows = await db
    .select()
    .from(captainsTable)
    .innerJoin(usersTable, eq(captainsTable.userId, usersTable.id))
    .orderBy(desc(captainsTable.createdAt));
  res.json(rows.map(r => formatCaptain(r.users, r.captains)));
});

// POST /api/admin/captains/:id/approve
router.post("/admin/captains/:id/approve", async (req, res) => {
  const paramsParsed = ApproveCaptainParams.safeParse(req.params);
  const bodyParsed = ApproveCaptainBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  // id here is the captain's USER id
  const [captainRow] = await db.select().from(captainsTable).where(eq(captainsTable.userId, paramsParsed.data.id));
  if (!captainRow) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }

  const newStatus = bodyParsed.data.approved ? "approved" : "rejected";
  const [updated] = await db
    .update(captainsTable)
    .set({ approvalStatus: newStatus, isApproved: bodyParsed.data.approved })
    .where(eq(captainsTable.id, captainRow.id))
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, paramsParsed.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatCaptain(user, updated));
});

// POST /api/admin/captains/:id/credit
router.post("/admin/captains/:id/credit", async (req, res) => {
  const paramsParsed = CreditCaptainParams.safeParse(req.params);
  const bodyParsed = CreditCaptainBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const [captainRow] = await db.select().from(captainsTable).where(eq(captainsTable.userId, paramsParsed.data.id));
  if (!captainRow) {
    res.status(404).json({ error: "Captain not found" });
    return;
  }

  const [updated] = await db
    .update(captainsTable)
    .set({ balance: captainRow.balance + bodyParsed.data.amount })
    .where(eq(captainsTable.id, captainRow.id))
    .returning();

  await db.insert(transactionsTable).values({
    captainId: captainRow.id,
    amount: bodyParsed.data.amount,
    type: "admin_credit",
    note: bodyParsed.data.note ?? "Admin credit",
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, paramsParsed.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatCaptain(user, updated));
});

// GET /api/admin/passengers
router.get("/admin/passengers", async (req, res) => {
  const passengers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "passenger"))
    .orderBy(desc(usersTable.createdAt));
  res.json(passengers.map(formatUser));
});

// GET /api/admin/trips
router.get("/admin/trips", async (req, res) => {
  const parsed = GetAdminTripsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { status, limit } = parsed.data;

  let query = db.select().from(tripsTable).orderBy(desc(tripsTable.createdAt)).$dynamic();
  if (status) {
    query = query.where(eq(tripsTable.status, status as any));
  }
  const trips = await query.limit(limit ?? 100);
  res.json(trips);
});

// GET /api/admin/complaints
router.get("/admin/complaints", async (req, res) => {
  const complaints = await db
    .select()
    .from(complaintsTable)
    .leftJoin(usersTable, eq(complaintsTable.userId, usersTable.id))
    .orderBy(desc(complaintsTable.createdAt));
  res.json(complaints.map(r => ({
    ...r.complaints,
    user: r.users ? { id: r.users.id, name: r.users.name, phone: r.users.phone, email: r.users.email, role: r.users.role, status: r.users.status, createdAt: r.users.createdAt } : undefined,
  })));
});

// POST /api/admin/complaints/:id/resolve
router.post("/admin/complaints/:id/resolve", async (req, res) => {
  const paramsParsed = ResolveComplaintParams.safeParse(req.params);
  const bodyParsed = ResolveComplaintBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, paramsParsed.data.id));
  if (!complaint) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  const [updated] = await db
    .update(complaintsTable)
    .set({ status: "resolved", adminNote: bodyParsed.data.adminNote, resolvedAt: new Date() })
    .where(eq(complaintsTable.id, complaint.id))
    .returning();
  res.json(updated);
});

// GET /api/admin/routes
router.get("/admin/routes", async (req, res) => {
  const routes = await db.select().from(routesTable).orderBy(desc(routesTable.createdAt));
  res.json(routes);
});

// POST /api/admin/routes
router.post("/admin/routes", async (req, res) => {
  const parsed = CreateRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [route] = await db.insert(routesTable).values(parsed.data).returning();
  res.status(201).json(route);
});

// PUT /api/admin/routes/:id
router.put("/admin/routes/:id", async (req, res) => {
  const paramsParsed = UpdateRouteParams.safeParse(req.params);
  const bodyParsed = UpdateRouteBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }
  const [route] = await db
    .update(routesTable)
    .set(bodyParsed.data)
    .where(eq(routesTable.id, paramsParsed.data.id))
    .returning();
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  res.json(route);
});

// DELETE /api/admin/routes/:id
router.delete("/admin/routes/:id", async (req, res) => {
  const parsed = DeleteRouteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(routesTable).where(eq(routesTable.id, parsed.data.id));
  res.status(204).send();
});

// GET /api/admin/discount-codes
router.get("/admin/discount-codes", async (req, res) => {
  const codes = await db.select().from(discountCodesTable).orderBy(desc(discountCodesTable.createdAt));
  res.json(codes);
});

// POST /api/admin/discount-codes
router.post("/admin/discount-codes", async (req, res) => {
  const parsed = CreateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [code] = await db.insert(discountCodesTable).values({
    code: parsed.data.code.toUpperCase(),
    discountPercent: parsed.data.discountPercent,
    maxUses: parsed.data.maxUses,
    expiresAt: parsed.data.expiresAt ?? null,
  }).returning();
  res.status(201).json(code);
});

// DELETE /api/admin/discount-codes/:id
router.delete("/admin/discount-codes/:id", async (req, res) => {
  const parsed = DeleteDiscountCodeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
