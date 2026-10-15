import { Router, type IRouter } from "express";
import healthRouter from "./health";
import disputesRouter from "./disputes";
import demoRouter from "./demo";
import paypalRouter from "./paypal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(disputesRouter);
router.use(demoRouter);
router.use(paypalRouter);

export default router;
