import { Router, type IRouter } from "express";
import {
  GetDisputeParams,
  GetDisputeResponse,
  GetDisputesResponse,
} from "@workspace/api-zod";
import { demoDisputes } from "../lib/demo-disputes";

const router: IRouter = Router();

router.get("/disputes", (_req, res) => {
  res.json(GetDisputesResponse.parse(demoDisputes));
});

router.get("/disputes/:id", (req, res) => {
  const params = GetDisputeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const dispute = demoDisputes.find((item) => item.id === params.data.id);
  if (!dispute) {
    res.status(404).json({ error: "Demo dispute not found" });
    return;
  }

  res.json(GetDisputeResponse.parse(dispute));
});

export default router;
