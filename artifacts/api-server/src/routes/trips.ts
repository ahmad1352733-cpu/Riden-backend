import { Router } from "express";
import { db } from "@workspace/db";
import {
  tripsTable,
  captainsTable,
  usersTable,
  discountCodesTable,
  transactionsTable,
  tripRequestsTable,
  tripGpsPointsTable,
} from "@workspace/db/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendPush } from "../lib/push";
import {
  calculateFare,
  getCaptainByUserId,
  getCaptainWithUser,
  formatUser,
  formatCaptain,
  haversineKm,
  getSettings,
} from "../lib/helpers";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildTripResponse(trip: typeof tripsTable.$inferSelect) {
  const [passenger] = await db.select().from(usersTable).where(eq(usersTable.id, trip.passengerId));
  let captainData: any = null;
  if (trip.captainId) {
    const data = await getCaptainWithUser(trip.captainId);
    if (data) captainData = formatCaptain(data.user, data.captain);
  }
  return {
    ...trip,
    passenger: passenger ? formatUser(passenger) : null,
    captain: captainData,
  };
}

// ─── POST /api/trips/estimate ──────────────────────────────────────────────────
router.post("/trips/estimate", requireAuth, async (req, res) => {
  const { distanceKm, durationMin, discountCode } = req.body;
  if (typeof distanceKm !== "number" || typeof durationMin !== "number") {
    res.status(400).json({ error: "distanceKm and durationMin required" });
    return;
  }
  const settings = await getSettings();
  const totalFare = calculateFare(distanceKm, durationMin, settings);

  let discountPercent = 0;
  if (discountCode) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, discountCode));
    if (dc && dc.isActive && dc.currentUses < dc.maxUses && (!dc.expiresAt || dc.expiresAt > new Date())) {
      discountPercent = dc.discountPercent;
    }
  }

  const discountAmount = Math.round((totalFare * discountPercent / 100) * 100) / 100;
  const finalFare = Math.round((totalFare - discountAmount) * 100) / 100;
  const freeKm = settings.free_km ?? 2;
  const baseFare = settings.base_fare ?? 1.0;
  const distanceFare = distanceKm > freeKm ? Math.round((distanceKm - freeKm) * (settings.per_km_rate ?? 0.25) * 100) / 100 : 0;
  const timeFare = distanceKm > freeKm ? Math.round(durationMin * (settings.per_min_rate ?? 0.05) * 100) / 100 : 0;

  res.json({ baseFare, distanceFare, timeFare, totalFare, discountAmount, finalFare, discountPercent: discountPercent || undefined });
});

// ─── POST /api/trips ───────────────────────────────────────────────────────────
router.post("/trips", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") {
    res.status(403).json({ error: "Only passengers can request trips" });
    return;
  }

  const { pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, discountCode } = req.body;
  if (!pickupLat || !pickupLng || !pickupAddress || !dropoffLat || !dropoffLng || !dropoffAddress) {
    res.status(400).json({ error: "All location fields required" });
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
  if (discountCode) {
    const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, discountCode));
    if (dc && dc.isActive && dc.currentUses < dc.maxUses && (!dc.expiresAt || dc.expiresAt > new Date())) {
      discountPercent = dc.discountPercent;
      await db.update(discountCodesTable).set({ currentUses: dc.currentUses + 1 }).where(eq(discountCodesTable.id, dc.id));
    }
  }

  const [trip] = await db.insert(tripsTable).values({
    passengerId: req.userId!,
    pickupLat, pickupLng, pickupAddress,
    dropoffLat, dropoffLng, dropoffAddress,
    discountPercent: discountPercent || null,
    discountCodeUsed: discountCode ?? null,
    status: "pending",
  }).returning();

  // Find 3 nearest online+approved captains and create trip_requests
  const captains = await db
    .select()
    .from(captainsTable)
    .where(and(
      eq(captainsTable.isApproved, true),
      eq(captainsTable.isOnline, true),
    ));

  const nearest3 = captains
    .map(c => ({
      ...c,
      dist: (c.currentLat && c.currentLng)
        ? haversineKm(pickupLat, pickupLng, c.currentLat, c.currentLng)
        : 9999, // كابتن بدون GPS يأتي في النهاية لكن يُشمل
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3);

  if (nearest3.length > 0) {
    await db.insert(tripRequestsTable).values(
      nearest3.map(c => ({ tripId: trip.id, captainId: c.id }))
    );

    // إرسال Push Notification للكباتن المختارين
    const captainUserIds = nearest3.map(c => c.userId);
    const captainUsers = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(or(...captainUserIds.map(id => eq(usersTable.id, id))));

    const tokens = captainUsers.map(u => u.pushToken).filter(Boolean) as string[];
    if (tokens.length > 0) {
      await sendPush(
        tokens,
        "🚗 طلب رحلة جديد!",
        `من: ${pickupAddress ?? "موقع الانطلاق"} → ${dropoffAddress ?? "موقع الوصول"}`,
        { screen: "trip-request", tripId: trip.id, channelId: "trip-requests" },
        "high",
      );
    }
  }

  res.status(201).json(await buildTripResponse(trip));
});

// ─── GET /api/trips/active ────────────────────────────────────────────────────
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
  res.json(await buildTripResponse(trip));
});

// ─── GET /api/trips/my ────────────────────────────────────────────────────────
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
  const withData = await Promise.all(trips.map(buildTripResponse));
  res.json(withData);
});

// ─── GET /api/trips/:id ───────────────────────────────────────────────────────
router.get("/trips/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await buildTripResponse(trip));
});

// ─── PATCH /api/trips/:id/cancel ─────────────────────────────────────────────
router.patch("/trips/:id/cancel", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }
  if (trip.passengerId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (trip.status === "completed" || trip.status === "cancelled") {
    res.status(400).json({ error: "Cannot cancel this trip" }); return;
  }
  const reason = req.body?.reason ?? req.body?.cancellationReason ?? null;
  const [updated] = await db
    .update(tripsTable)
    .set({ status: "cancelled", cancellationReason: reason })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // أبلغ الكابتن المعيّن (إن وجد) أن الراكب ألغى الرحلة
  if (trip.captainId) {
    const [captain] = await db
      .select({ userId: captainsTable.userId })
      .from(captainsTable)
      .where(eq(captainsTable.id, trip.captainId));
    if (captain) {
      const [captainUser] = await db
        .select({ pushToken: usersTable.pushToken })
        .from(usersTable)
        .where(eq(usersTable.id, captain.userId));
      if (captainUser?.pushToken) {
        await sendPush(
          [captainUser.pushToken],
          "❌ تم إلغاء الرحلة",
          "قام الراكب بإلغاء الرحلة",
          { screen: "trip-request", tripId: String(id), channelId: "trip-requests" },
          "high",
        );
      }
    }
  } else {
    // الرحلة لم تُقبل بعد — أبلغ الكباتن المرشّحين لها
    const pendingRequests = await db
      .select({ captainId: tripRequestsTable.captainId })
      .from(tripRequestsTable)
      .where(eq(tripRequestsTable.tripId, id));
    if (pendingRequests.length > 0) {
      const captainIds = pendingRequests.map(r => r.captainId);
      const captainRecords = await db
        .select({ userId: captainsTable.userId })
        .from(captainsTable)
        .where(or(...captainIds.map(cid => eq(captainsTable.id, cid))));
      const userIds = captainRecords.map(c => c.userId);
      if (userIds.length > 0) {
        const users = await db
          .select({ pushToken: usersTable.pushToken })
          .from(usersTable)
          .where(or(...userIds.map(uid => eq(usersTable.id, uid))));
        const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
        if (tokens.length > 0) {
          await sendPush(
            tokens,
            "❌ ألغى الراكب الطلب",
            "تم إلغاء طلب الرحلة من قِبل الراكب",
            { type: "trip-cancelled", tripId: String(id), channelId: "trip-requests" },
            "high",
          );
        }
      }
    }
  }

  res.json(updated);
});

// ─── PATCH /api/trips/:id/accept ─────────────────────────────────────────────
router.patch("/trips/:id/accept", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Captains only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData || !captainData.captain.isApproved) {
    res.status(403).json({ error: "Captain not approved" }); return;
  }

  // تأكد أن هذا الكابتن كان ضمن المدعوّين لهذه الرحلة
  const [request] = await db
    .select()
    .from(tripRequestsTable)
    .where(and(eq(tripRequestsTable.tripId, id), eq(tripRequestsTable.captainId, captainData.captain.id)));
  if (!request) {
    res.status(403).json({ error: "Trip not assigned to you" }); return;
  }

  // ── عملية ذرية: SELECT FOR UPDATE داخل Transaction لمنع القبول المزدوج ───
  let updated: typeof tripsTable.$inferSelect | undefined;
  try {
    updated = await db.transaction(async (tx) => {
      // قفل الصف — أي كابتن آخر يحاول نفس العملية سينتظر حتى تنتهي هذه
      const [current] = await tx
        .select()
        .from(tripsTable)
        .where(eq(tripsTable.id, id))
        .for("update");

      if (!current || current.status !== "pending") {
        throw new Error("TRIP_TAKEN");
      }

      const [row] = await tx
        .update(tripsTable)
        .set({ status: "accepted", captainId: captainData.captain.id })
        .where(and(eq(tripsTable.id, id), eq(tripsTable.status, "pending")))
        .returning();

      if (!row) throw new Error("TRIP_TAKEN");
      return row;
    });
  } catch (e: any) {
    if (e.message === "TRIP_TAKEN") {
      res.status(409).json({ error: "Trip already accepted by another captain" });
      return;
    }
    throw e;
  }

  const captainName = captainData.user?.name ?? "الكابتن";

  // ── إشعار الراكب مع اسم الكابتن ──────────────────────────────────────────
  const [passengerUser] = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, updated.passengerId));
  if (passengerUser?.pushToken) {
    await sendPush(
      [passengerUser.pushToken],
      "✅ تم قبول رحلتك!",
      `الكابتن ${captainName} في طريقه إليك الآن`,
      { screen: "trip-update", tripId: String(id), channelId: "trip-updates" },
      "high",
    );
  }

  // ── إشعار الكباتن الآخرين بأن الرحلة قُبلت — يُزيلونها فوراً ───────────
  const otherRequests = await db
    .select({ captainId: tripRequestsTable.captainId })
    .from(tripRequestsTable)
    .where(eq(tripRequestsTable.tripId, id));
  const otherCaptainIds = otherRequests
    .map(r => r.captainId)
    .filter(cid => cid !== captainData.captain.id);

  if (otherCaptainIds.length > 0) {
    const otherCaptains = await db
      .select({ userId: captainsTable.userId })
      .from(captainsTable)
      .where(or(...otherCaptainIds.map(cid => eq(captainsTable.id, cid))));
    const otherUserIds = otherCaptains.map(c => c.userId);
    const otherUsers = await db
      .select({ pushToken: usersTable.pushToken })
      .from(usersTable)
      .where(or(...otherUserIds.map(uid => eq(usersTable.id, uid))));
    const otherTokens = otherUsers.map(u => u.pushToken).filter(Boolean) as string[];
    if (otherTokens.length > 0) {
      await sendPush(
        otherTokens,
        "❌ تم قبول الرحلة من سائق آخر",
        `قبل الكابتن ${captainName} هذه الرحلة`,
        { type: "trip-taken", tripId: String(id), channelId: "trip-requests" },
        "high",
      );
    }
  }

  res.json(await buildTripResponse(updated));
});

// ─── PATCH /api/trips/:id/reject ─────────────────────────────────────────────
router.patch("/trips/:id/reject", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Captains only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData) { res.status(403).json({ error: "Not found" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip || trip.status !== "pending") {
    res.status(400).json({ error: "Trip not available to reject" }); return;
  }

  // حذف طلب الرحلة لهذا الكابتن فقط حتى يُرسَل لكابتن آخر
  await db
    .delete(tripRequestsTable)
    .where(and(eq(tripRequestsTable.tripId, id), eq(tripRequestsTable.captainId, captainData.captain.id)));

  res.json({ success: true });
});

// ─── PATCH /api/trips/:id/start ──────────────────────────────────────────────
router.patch("/trips/:id/start", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Captains only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData) { res.status(403).json({ error: "Not found" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip || trip.status !== "accepted" || trip.captainId !== captainData.captain.id) {
    res.status(400).json({ error: "Cannot start this trip" }); return;
  }

  const [updated] = await db
    .update(tripsTable)
    .set({ status: "started", startedAt: new Date() })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // أبلغ الراكب أن الرحلة بدأت
  const [startPassenger] = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, trip.passengerId));
  if (startPassenger?.pushToken) {
    await sendPush(
      [startPassenger.pushToken],
      "بدأت رحلتك 🚗",
      "الكابتن انطلق بك الآن — استمتع بالرحلة!",
      { screen: "trip-update", tripId: String(id), channelId: "trip-updates" },
      "high",
    );
  }

  res.json(await buildTripResponse(updated));
});

// ─── PATCH /api/trips/:id/complete ───────────────────────────────────────────
router.patch("/trips/:id/complete", requireAuth, async (req, res) => {
  if (req.userRole !== "captain") { res.status(403).json({ error: "Captains only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const captainData = await getCaptainByUserId(req.userId!);
  if (!captainData) { res.status(403).json({ error: "Not found" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip || trip.status !== "started" || trip.captainId !== captainData.captain.id) {
    res.status(400).json({ error: "Cannot complete this trip" }); return;
  }

  // احسب المسافة من نقاط GPS المخزّنة على السيرفر منذ بداية الرحلة
  const gpsPoints = await db
    .select({ lat: tripGpsPointsTable.lat, lng: tripGpsPointsTable.lng })
    .from(tripGpsPointsTable)
    .where(eq(tripGpsPointsTable.tripId, trip.id))
    .orderBy(asc(tripGpsPointsTable.recordedAt));

  let serverDistanceKm = 0;
  for (let i = 1; i < gpsPoints.length; i++) {
    const d = haversineKm(
      gpsPoints[i - 1].lat, gpsPoints[i - 1].lng,
      gpsPoints[i].lat, gpsPoints[i].lng,
    );
    if (d < 5) serverDistanceKm += d; // تجاهل القفزات الكبيرة
  }
  // حد أدنى 0.1 كم إذا GPS ما سجّل نقاط كافية
  const distanceKm = Math.max(Math.round(serverDistanceKm * 100) / 100, 0.1);

  // الوقت يُحسب من السيرفر — لا يمكن للكابتن التلاعب به
  const now = new Date();
  const durationMin = trip.startedAt
    ? Math.max(1, Math.round((now.getTime() - new Date(trip.startedAt).getTime()) / 60000))
    : 1;

  const settings = await getSettings();
  const fare = calculateFare(distanceKm, durationMin, settings);
  const discountPercent = trip.discountPercent ?? 0;
  const discountAmount = fare * discountPercent / 100;
  const finalFare = Math.round((fare - discountAmount) * 100) / 100;

  const commissionRate = settings.commission_rate ?? 0.1;
  const commission = Math.round(finalFare * commissionRate * 100) / 100;
  const earning = Math.round((finalFare - commission) * 100) / 100;

  const [updated] = await db
    .update(tripsTable)
    .set({ status: "completed", distanceKm, durationMin, fare, finalFare, completedAt: new Date() })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // الرصيد = رصيد كفالة الكابتن — تُخصم منه العمولة فقط
  // الكابتن يستلم الأجرة نقداً من الراكب مباشرة
  await db.update(captainsTable).set({
    balance: captainData.captain.balance - commission,
    totalTrips: captainData.captain.totalTrips + 1,
  }).where(eq(captainsTable.id, captainData.captain.id));

  await db.insert(transactionsTable).values([
    { captainId: captainData.captain.id, tripId: trip.id, amount: earning, type: "trip_earning", note: `رحلة رقم #${trip.id} - أجرة نقدية` },
    { captainId: captainData.captain.id, tripId: trip.id, amount: -commission, type: "trip_commission", note: `عمولة ${Math.round(commissionRate * 100)}% على رحلة #${trip.id}` },
  ]);

  // حذف نقاط GPS بعد حساب المسافة (تنظيف)
  await db.delete(tripGpsPointsTable).where(eq(tripGpsPointsTable.tripId, trip.id));

  // أبلغ الراكب أن الرحلة اكتملت
  const [completePassenger] = await db
    .select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, trip.passengerId));
  if (completePassenger?.pushToken) {
    await sendPush(
      [completePassenger.pushToken],
      "🏁 اكتملت رحلتك",
      `المسافة: ${distanceKm} كم — الأجرة: ${finalFare} د.أ`,
      { screen: "trip-update", tripId: String(id), channelId: "trip-updates" },
      "high",
    );
  }

  res.json(await buildTripResponse(updated));
});

// ─── POST /api/trips/:id/rate ─────────────────────────────────────────────────
router.post("/trips/:id/rate", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") { res.status(403).json({ error: "Passengers only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { rating } = req.body;
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be 1-5" }); return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip || trip.status !== "completed" || trip.passengerId !== req.userId) {
    res.status(400).json({ error: "Cannot rate this trip" }); return;
  }

  const [updated] = await db
    .update(tripsTable)
    .set({ rating })
    .where(eq(tripsTable.id, trip.id))
    .returning();

  // Update captain running average rating
  if (trip.captainId) {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.id, trip.captainId));
    if (captain) {
      const n = captain.totalTrips || 1;
      const newRating = Math.round(((captain.rating * (n - 1) + rating) / n) * 10) / 10;
      await db.update(captainsTable).set({ rating: newRating }).where(eq(captainsTable.id, captain.id));
    }
  }

  res.json(updated);
});

// ─── PATCH /api/trips/:id/passenger-location ──────────────────────────────────
router.patch("/trips/:id/passenger-location", requireAuth, async (req, res) => {
  if (req.userRole !== "passenger") { res.status(403).json({ error: "Passengers only" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng required" }); return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip || trip.passengerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(tripsTable)
    .set({ passengerLat: lat, passengerLng: lng, passengerLocationUpdatedAt: new Date() })
    .where(eq(tripsTable.id, id));
  res.json({ success: true });
});

// ─── GET /api/trips/:id/tracking ─────────────────────────────────────────────
router.get("/trips/:id/tracking", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip) { res.status(404).json({ error: "Not found" }); return; }

  let captainLat = null, captainLng = null;
  let updatedAt = new Date();
  if (trip.captainId) {
    const [captain] = await db.select().from(captainsTable).where(eq(captainsTable.id, trip.captainId));
    if (captain) {
      captainLat = captain.currentLat ?? null;
      captainLng = captain.currentLng ?? null;
      updatedAt = captain.locationUpdatedAt ?? new Date();
    }
  }
  res.json({
    tripId: trip.id,
    captainLat, captainLng, updatedAt,
    passengerLat: trip.passengerLat ?? null,
    passengerLng: trip.passengerLng ?? null,
  });
});

export default router;
