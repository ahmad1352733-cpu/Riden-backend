import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import captainsRouter from "./captains";
import tripsRouter from "./trips";
import discountCodesRouter from "./discount-codes";
import complaintsRouter from "./complaints";
import routesResourceRouter from "./routes-resource";
import adminRouter from "./admin";

const router: IRouter = Router();

// ── Spec-URL aliases (generated client uses these exact paths) ──────────────
// Maps openapi.yaml operationId URLs → actual server route URLs
router.use((req, _res, next) => {
  const key = `${req.method}:${req.path}`;
  const rewrites: Record<string, string> = {
    // Auth / registration
    "POST:/auth/register":          "/auth/register/passenger",
    "POST:/captains/register":      "/auth/register/captain",
    // Captain profile + actions
    "GET:/captains/profile":        "/captains/me",
    "PATCH:/captains/availability": "/captains/me/availability",
    "PATCH:/captains/location":     "/captains/me/location",
    "GET:/captains/trips":          "/captains/me/trips",
    "GET:/captains/earnings":       "/captains/me/earnings",
    "GET:/captains/pending-trip":   "/captains/me/pending-trip",
    "GET:/captains/active-trip":    "/captains/me/active-trip",
    "GET:/captains/transactions":   "/captains/me/transactions",
    // Passenger trips
    "GET:/trips":                   "/trips/my",
    "POST:/trips/fare-estimate":    "/trips/estimate",
  };
  if (rewrites[key]) {
    req.url = rewrites[key];
    // also fix method if needed (PUT → PATCH aliases)
    if (key.startsWith("PATCH:/captains/")) req.method = "PUT";
  }
  next();
});

router.use(healthRouter);
router.use(authRouter);
router.use(captainsRouter);
router.use(tripsRouter);
router.use(discountCodesRouter);
router.use(complaintsRouter);
router.use(routesResourceRouter);
router.use(adminRouter);

export default router;
