import { Router } from "express";
import { db } from "@workspace/db";
import { routesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// GET /api/routes
router.get("/routes", requireAuth, async (req, res) => {
  const routes = await db.select().from(routesTable).where(eq(routesTable.isActive, true));
  res.json(routes);
});

export default router;
