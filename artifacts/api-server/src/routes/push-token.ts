import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// POST /api/users/push-token — يحفظ توكن الجهاز
router.post("/users/push-token", requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  await db.update(usersTable).set({ pushToken: token }).where(eq(usersTable.id, req.userId!));
  res.json({ ok: true });
});

export default router;
