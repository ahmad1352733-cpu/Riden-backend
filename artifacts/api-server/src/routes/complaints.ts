import { Router } from "express";
import { db } from "@workspace/db";
import { complaintsTable, usersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { SubmitComplaintBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

// POST /api/complaints
router.post("/complaints", requireAuth, async (req, res) => {
  const parsed = SubmitComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [complaint] = await db.insert(complaintsTable).values({
    userId: req.userId!,
    tripId: parsed.data.tripId ?? null,
    type: parsed.data.type,
    description: parsed.data.description,
  }).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json({
    ...complaint,
    user: user ? { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt } : undefined,
  });
});

// GET /api/complaints/my
router.get("/complaints/my", requireAuth, async (req, res) => {
  const complaints = await db
    .select()
    .from(complaintsTable)
    .where(eq(complaintsTable.userId, req.userId!))
    .orderBy(desc(complaintsTable.createdAt));
  res.json(complaints);
});

export default router;
