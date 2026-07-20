import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, or, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendPush } from "../lib/push";

const router = Router();

// GET /api/notifications — جلب إشعارات المستخدم الحالي
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const role = req.userRole!;

  // جلب تاريخ تسجيل المستخدم
  const [user] = await db
    .select({ createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const registeredAt = user?.createdAt ?? new Date(0);
  const broadcastTarget = role === "captain" ? "captains" : "passengers";

  // الإشعارات الشخصية المباشرة تظهر دائماً
  // الإشعارات العامة (all / captains / passengers) تظهر فقط إذا أُرسلت بعد تسجيل المستخدم
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      or(
        eq(notificationsTable.userId, userId),
        and(
          or(
            eq(notificationsTable.target, "all"),
            eq(notificationsTable.target, broadcastTarget),
          ),
          gte(notificationsTable.createdAt, registeredAt),
        ),
      )
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(rows);
});

// PATCH /api/notifications/:id/read — تعليم كمقروء
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all — تعليم الكل كمقروء
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const role = req.userRole!;
  await db.update(notificationsTable).set({ isRead: true }).where(
    or(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.target, "all"),
      eq(notificationsTable.target, role === "captain" ? "captains" : "passengers"),
    )
  );
  res.json({ ok: true });
});

// POST /api/admin/notifications — إرسال إشعار (أدمن فقط)
router.post("/admin/notifications", requireAuth, async (req, res) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, body, target, userId } = req.body;
  if (!title || !body || !target) {
    res.status(400).json({ error: "title, body, target مطلوبة" });
    return;
  }

  if (target === "user" && userId) {
    // إشعار لمستخدم محدد
    const [row] = await db.insert(notificationsTable).values({ title, body, target: "user", userId }).returning();

    // Push للمستخدم المحدد
    const [u] = await db.select({ pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, userId));
    if (u?.pushToken) await sendPush([u.pushToken], title, body, { screen: "notifications", channelId: "general" });

    res.status(201).json(row);
  } else {
    // بث جماعي
    const [row] = await db.insert(notificationsTable).values({ title, body, target }).returning();

    // Push للمستخدمين المستهدفين
    let roleFilter: string[] = [];
    if (target === "all")        roleFilter = ["captain", "passenger"];
    if (target === "captains")   roleFilter = ["captain"];
    if (target === "passengers") roleFilter = ["passenger"];

    if (roleFilter.length > 0) {
      const users = await db
        .select({ pushToken: usersTable.pushToken })
        .from(usersTable)
        .where(or(...roleFilter.map(r => eq(usersTable.role, r as any))));
      const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
      if (tokens.length > 0) await sendPush(tokens, title, body, { screen: "notifications", channelId: "general" });
    }

    res.status(201).json(row);
  }
});

// GET /api/admin/notifications — قائمة الإشعارات المرسلة
router.get("/admin/notifications", requireAuth, async (req, res) => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(100);
  res.json(rows);
});

export default router;
