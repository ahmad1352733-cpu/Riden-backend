import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/debug/push-log — يستقبل logs من الموبايل (بدون auth)
router.post("/debug/push-log", (req: any, res: any) => {
  const { step, data } = req.body ?? {};
  console.log(`[PUSH-DEBUG] step=${step ?? "?"}`, JSON.stringify(data ?? {}));
  res.json({ ok: true });
});

// POST /api/debug/make-admin — ترقية مستخدم لـ admin (مؤقت)
router.post("/debug/make-admin", async (req: any, res: any) => {
  const { email, secret } = req.body ?? {};
  if (secret !== process.env.SESSION_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(eq(usersTable.email, email))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
