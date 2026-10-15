import { Router, type IRouter } from "express";
import {
  GetActivityResponse,
  GetDashboardSummaryResponse,
} from "@workspace/api-zod";
import { demoActivity, demoDisputes } from "../lib/demo-disputes";

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  const openCases = demoDisputes.filter((item) => item.status !== "resolved");
  const now = Date.now();
  const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingDeadlines = openCases.filter((item) => {
    const deadline = item.responseDeadline.getTime();
    return deadline >= now && deadline <= nextWeek;
  });

  res.json(
    GetDashboardSummaryResponse.parse({
      openDisputes: openCases.length,
      moneyAtRisk: openCases.reduce((sum, item) => sum + item.amount, 0),
      upcomingDeadlines: upcomingDeadlines.length,
      casesResolved: demoDisputes.filter((item) => item.status === "resolved")
        .length,
    }),
  );
});

router.get("/activity", (_req, res) => {
  res.json(GetActivityResponse.parse(demoActivity));
});

export default router;
