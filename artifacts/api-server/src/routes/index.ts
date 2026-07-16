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

router.use(healthRouter);
router.use(authRouter);
router.use(captainsRouter);
router.use(tripsRouter);
router.use(discountCodesRouter);
router.use(complaintsRouter);
router.use(routesResourceRouter);
router.use(adminRouter);

export default router;
