import { Router, type IRouter } from "express";
import {
  AnalyzeDemoDisputeParams,
  AnalyzeDemoDisputeResponse,
} from "@workspace/api-zod";
import { demoDisputes } from "../lib/demo-disputes";
import {
  generateDisputeAnalysis,
  OpenAIAnalysisError,
} from "../lib/openai-dispute-analysis";

const router: IRouter = Router();

function analysisError(code: string): { error: string; code: string } {
  const errors: Record<string, string> = {
    invalid_request: "This analysis endpoint accepts only a simulated case ID.",
    dispute_not_found: "Simulated demo dispute not found.",
    openai_not_configured:
      "AI analysis is not configured. Add OPENAI_API_KEY in Replit Secrets.",
    openai_authentication_failed:
      "The AI provider rejected its server-side credentials. Check OPENAI_API_KEY in Replit Secrets.",
    openai_rate_limited:
      "OpenAI is temporarily rate-limiting requests. Try again shortly.",
    openai_quota_exceeded:
      "The OpenAI API account has no available quota. Check its billing and usage limits.",
    openai_unavailable:
      "The AI provider is temporarily unavailable. Try again later.",
    invalid_openai_response:
      "The AI provider returned a response that could not be safely validated.",
    openai_timeout: "The AI analysis request timed out. Try again.",
  };
  return { error: errors[code] ?? "AI analysis could not be completed.", code };
}

router.post(
  "/demo/disputes/:id/analyze",
  async (req, res): Promise<void> => {
    const params = AnalyzeDemoDisputeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json(analysisError("invalid_request"));
      return;
    }

    const body = req.body as unknown;
    if (
      body != null &&
      (typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    ) {
      res.status(400).json(analysisError("invalid_request"));
      return;
    }

    const dispute = demoDisputes.find((item) => item.id === params.data.id);
    if (!dispute) {
      res.status(404).json(analysisError("dispute_not_found"));
      return;
    }

    try {
      const modelAnalysis = await generateDisputeAnalysis(dispute);
      const result = AnalyzeDemoDisputeResponse.parse({
        source: "simulated_demo",
        disputeId: dispute.id,
        disputeReason: dispute.reason,
        disputedAmount: dispute.amount,
        currency: dispute.currency,
        evidenceCurrentlyAvailable: [],
        evidenceAvailabilityNote:
          "No uploaded or verified evidence is stored for this simulated case.",
        analysis: modelAnalysis,
        responseDeadline: dispute.responseDeadline,
        disclaimer:
          "AI-generated informational analysis of simulated data for seller review only. Verify all facts independently; no payment action was taken.",
      });
      res.json(result);
    } catch (error) {
      if (error instanceof OpenAIAnalysisError) {
        req.log.warn(
          { failureCode: error.code, statusCode: error.statusCode },
          "Simulated dispute analysis could not be completed",
        );
        res.status(error.statusCode).json(analysisError(error.code));
        return;
      }

      req.log.error(
        { errorName: error instanceof Error ? error.name : "unknown" },
        "Unexpected simulated dispute analysis error",
      );
      res.status(502).json(analysisError("openai_unavailable"));
    }
  },
);

export default router;
