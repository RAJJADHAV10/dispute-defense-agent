import { Router, type IRouter } from "express";
import healthRouter from "./health";
import disputesRouter from "./disputes";
import demoRouter from "./demo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(disputesRouter);
router.use(demoRouter);

export default router;
