import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// POST /api/users/push-token — يحفظ توكن الجهاز (FCM أو Expo)
router.post("/users/push-token", requireAuth, async (req, res) => {
  const { token, type } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  console.log(`[push-token] saving token type=${type ?? "unknown"} for user=${req.userId}`);
  const result = await db.update(usersTable).set({ pushToken: token }).where(eq(usersTable.id, req.userId!));
  console.log(`[push-token] update result:`, JSON.stringify(result));
  res.json({ ok: true, type, tokenPrefix: token.slice(0, 20) });
});

export default router;
