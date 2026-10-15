import { Router, type IRouter } from "express";
import {
  GetPayPalDisputesResponse,
  GetPayPalStatusResponse,
} from "@workspace/api-zod";
import { demoDisputes } from "../lib/demo-disputes";
import {
  getPayPalAccessToken,
  hasPayPalCredentials,
  listPayPalDisputes,
  PayPalServiceError,
  type PayPalErrorCode,
} from "../lib/paypal-client";

const router: IRouter = Router();
type PayPalStatusValue =
  | "connected"
  | "not_configured"
  | "authentication_failed"
  | "unavailable";

function errorCode(error: unknown): PayPalErrorCode {
  return error instanceof PayPalServiceError
    ? error.code
    : "network_error";
}

function statusForError(
  code: PayPalErrorCode,
): Exclude<PayPalStatusValue, "connected"> {
  if (code === "not_configured") return "not_configured" as const;
  if (code === "authentication_failed") {
    return "authentication_failed" as const;
  }
  return "unavailable" as const;
}

function statusMessage(status: PayPalStatusValue): string {
  switch (status) {
    case "connected":
      return "PayPal Sandbox authentication succeeded. Credentials and tokens remain server-side.";
    case "not_configured":
      return "PayPal Sandbox credentials are missing. The existing demo dataset remains available.";
    case "authentication_failed":
      return "PayPal Sandbox authentication failed. Check the configured credentials in Replit Secrets.";
    case "unavailable":
      return "PayPal Sandbox could not be reached. No credentials or tokens were exposed.";
  }
}

function toSimulatedSummary(dispute: (typeof demoDisputes)[number]) {
  return {
    id: `DEMO-${dispute.id}`,
    status: `SIMULATED_${dispute.status.toUpperCase()}`,
    reason: dispute.reason,
    amount: dispute.amount.toFixed(2),
    currencyCode: dispute.currency,
    createdAt: dispute.openedAt,
    updatedAt: null,
    responseDeadline: dispute.responseDeadline,
    lifecycleStage: "SIMULATED",
    channel: "SIMULATED",
    isSimulated: true,
  };
}

router.get("/paypal/status", async (req, res): Promise<void> => {
  const configured = hasPayPalCredentials();
  let status: PayPalStatusValue;
  let authenticated = false;

  try {
    await getPayPalAccessToken();
    status = "connected";
    authenticated = true;
  } catch (error) {
    const code = errorCode(error);
    status = statusForError(code);
    req.log.warn({ errorCode: code }, "PayPal Sandbox authentication check failed");
  }

  res.json(
    GetPayPalStatusResponse.parse({
      configured,
      authenticated,
      status,
      message: statusMessage(status),
      checkedAt: new Date(),
    }),
  );
});

router.get("/paypal/disputes", async (req, res): Promise<void> => {
  try {
    const disputes = await listPayPalDisputes();
    const empty = disputes.length === 0;
    res.json(
      GetPayPalDisputesResponse.parse({
        source: "paypal_sandbox",
        status: "connected",
        isSimulated: false,
        message: empty
          ? "PayPal Sandbox returned no disputes."
          : "Disputes were retrieved from the PayPal Sandbox account.",
        errorCode: null,
        total: disputes.length,
        disputes,
      }),
    );
  } catch (error) {
    const code = errorCode(error);
    req.log.warn(
      { errorCode: code },
      "PayPal Sandbox dispute request used the simulated fallback",
    );

    const disputes = demoDisputes.map(toSimulatedSummary);
    res.json(
      GetPayPalDisputesResponse.parse({
        source: "simulated_fallback",
        status: "fallback",
        isSimulated: true,
        message:
          "PayPal Sandbox data is unavailable. These are simulated demo cases, not PayPal disputes.",
        errorCode: code,
        total: disputes.length,
        disputes,
      }),
    );
  }
});

export default router;
