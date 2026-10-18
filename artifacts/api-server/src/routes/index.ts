import { Router, type IRouter } from "express";
import healthRouter from "./health";
import disputesRouter from "./disputes";
import demoRouter from "./demo";
import paypalRouter from "./paypal";
import disputeAnalysisRouter from "./dispute-analysis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(disputesRouter);
router.use(demoRouter);
router.use(paypalRouter);
router.use(disputeAnalysisRouter);

export default router;
