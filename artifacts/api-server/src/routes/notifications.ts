import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// GET /api/notifications — جلب إشعارات المستخدم الحالي
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const role = req.userRole!;

  // الإشعارات الخاصة بالمستخدم + البث العام المناسب له
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(
      or(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.target, "all"),
        eq(notificationsTable.target, role === "captain" ? "captains" : "passengers"),
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
    res.status(201).json(row);
  } else {
    // بث جماعي
    const [row] = await db.insert(notificationsTable).values({ title, body, target }).returning();
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
