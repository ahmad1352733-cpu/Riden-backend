import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

// POST /api/users/push-token — يحفظ توكن الجهاز (FCM أو Expo)
router.post("/users/push-token", requireAuth, async (req, res) => {
  const { token, type } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token مطلوب" });
    return;
  }
  const userId = req.userId!;
  console.log(`[push-token] saving token type=${type ?? "unknown"} for user=${userId} token=${token.slice(0, 30)}...`);
  // raw SQL لتجنب أي مشكلة مع Drizzle mapping
  const result = await pool.query(
    "UPDATE users SET push_token = $1 WHERE id = $2 RETURNING id, push_token",
    [token, userId]
  );
  console.log(`[push-token] rows updated=${result.rowCount}, returned=${JSON.stringify(result.rows)}`);
  res.json({ ok: true, type, tokenPrefix: token.slice(0, 20), updated: result.rowCount });
});

export default router;
