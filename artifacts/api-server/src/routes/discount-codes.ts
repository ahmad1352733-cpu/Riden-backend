import { Router } from "express";
import { db } from "@workspace/db";
import { discountCodesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ValidateDiscountCodeBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

// POST /api/discount-codes/validate
router.post("/discount-codes/validate", requireAuth, async (req, res) => {
  const parsed = ValidateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [dc] = await db.select().from(discountCodesTable).where(eq(discountCodesTable.code, parsed.data.code));
  if (!dc || !dc.isActive || dc.currentUses >= dc.maxUses || (dc.expiresAt && dc.expiresAt < new Date())) {
    res.status(404).json({ error: "Invalid or expired discount code" });
    return;
  }
  res.json(dc);
});

export default router;
