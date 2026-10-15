import type { PayPalDisputeSummary } from "@workspace/api-zod";

const PAYPAL_SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const REQUEST_TIMEOUT_MS = 12_000;

export type PayPalErrorCode =
  | "not_configured"
  | "authentication_failed"
  | "paypal_api_error"
  | "network_error"
  | "invalid_response";

export class PayPalServiceError extends Error {
  constructor(
    readonly code: PayPalErrorCode,
    readonly upstreamStatus?: number,
  ) {
    super(code);
    this.name = "PayPalServiceError";
  }
}

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | undefined;
let tokenRequest: Promise<string> | undefined;

export function hasPayPalCredentials(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() &&
      process.env.PAYPAL_CLIENT_SECRET?.trim(),
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new PayPalServiceError("network_error");
  }

  if (!response.ok) {
    throw new PayPalServiceError(
      "paypal_api_error",
      response.status,
    );
  }

  try {
    return { response, body: await response.json() };
  } catch {
    throw new PayPalServiceError("invalid_response", response.status);
  }
}

export async function getPayPalAccessToken(
  forceRefresh = false,
): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new PayPalServiceError("not_configured");
  }

  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  if (!forceRefresh && tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );
    let response: Response;
    try {
      response = await fetch(`${PAYPAL_SANDBOX_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new PayPalServiceError("network_error");
    }

    if (!response.ok) {
      if ([400, 401, 403].includes(response.status)) {
        throw new PayPalServiceError(
          "authentication_failed",
          response.status,
        );
      }
      throw new PayPalServiceError("paypal_api_error", response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PayPalServiceError("invalid_response", response.status);
    }

    const tokenResponse = asRecord(body);
    const accessToken = tokenResponse?.access_token;
    const expiresIn = tokenResponse?.expires_in;
    if (
      typeof accessToken !== "string" ||
      typeof expiresIn !== "number" ||
      expiresIn <= 0
    ) {
      throw new PayPalServiceError("invalid_response", response.status);
    }

    // Keep the token only in server memory and refresh before its expiry.
    cachedToken = {
      accessToken,
      expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1_000,
    };
    return accessToken;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

export function invalidatePayPalAccessToken(): void {
  cachedToken = undefined;
}

function normalizePayPalDispute(value: unknown): PayPalDisputeSummary {
  const dispute = asRecord(value);
  const amount =
    asRecord(dispute?.dispute_amount) ??
    asRecord(dispute?.disputed_amount) ??
    asRecord(dispute?.amount);
  const rawAmount = amount?.value;

  return {
    id: asString(dispute?.dispute_id),
    status: asString(dispute?.status),
    reason: asString(dispute?.reason),
    amount:
      typeof rawAmount === "string"
        ? rawAmount
        : typeof rawAmount === "number"
          ? String(rawAmount)
          : null,
    currencyCode: asString(amount?.currency_code),
    createdAt: asDate(dispute?.create_time),
    updatedAt: asDate(dispute?.update_time),
    responseDeadline: asDate(dispute?.seller_response_due_date),
    lifecycleStage: asString(dispute?.dispute_life_cycle_stage),
    channel: asString(dispute?.dispute_channel),
    isSimulated: false,
  };
}

async function fetchDisputePage(
  accessToken: string,
): Promise<{ response: Response; body: unknown }> {
  return fetchJson(`${PAYPAL_SANDBOX_URL}/v1/customer/disputes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

export async function listPayPalDisputes(): Promise<PayPalDisputeSummary[]> {
  let accessToken = await getPayPalAccessToken();
  let result: { response: Response; body: unknown };

  try {
    result = await fetchDisputePage(accessToken);
  } catch (error) {
    if (
      !(error instanceof PayPalServiceError) ||
      ![401, 403].includes(error.upstreamStatus ?? 0)
    ) {
      throw error;
    }

    invalidatePayPalAccessToken();
    accessToken = await getPayPalAccessToken(true);
    result = await fetchDisputePage(accessToken);
  }

  const payload = asRecord(result.body);
  if (!payload || !Array.isArray(payload.items)) {
    throw new PayPalServiceError("invalid_response", result.response.status);
  }

  return payload.items.map(normalizePayPalDispute);
}
