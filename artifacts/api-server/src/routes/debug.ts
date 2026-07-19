import { Router } from "express";

const router = Router();

// POST /api/debug/push-log — يستقبل logs من الموبايل (بدون auth)
router.post("/debug/push-log", (req: any, res: any) => {
  const { step, data } = req.body ?? {};
  console.log(`[PUSH-DEBUG] step=${step ?? "?"}`, JSON.stringify(data ?? {}));
  res.json({ ok: true });
});

export default router;
