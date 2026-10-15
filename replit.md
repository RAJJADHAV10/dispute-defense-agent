# Dispute Defense Agent

A demo dispute-review dashboard for small online sellers, backed by an Express API with simulated in-memory cases.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dispute-defense-agent run dev` — run the React web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `GET /api/health` — API health check
- `GET /api/paypal/status` — safely test PayPal Sandbox OAuth using server-side secrets
- `GET /api/paypal/disputes` — read the PayPal Sandbox dispute list, or a labelled demo fallback
- The demo dataset does not require PayPal credentials; Sandbox endpoints use `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from Replit Secrets.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- PayPal: server-only Sandbox OAuth and read-only Disputes API requests
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dispute-defense-agent` — React, TypeScript, and Tailwind web dashboard
- `artifacts/api-server/src/lib/demo-disputes.ts` — in-memory sample cases and activity
- `artifacts/api-server/src/lib/paypal-client.ts` — server-only PayPal Sandbox OAuth and read client
- `artifacts/api-server/src/routes` — health, demo, and PayPal endpoints
- `lib/api-spec/openapi.yaml` — API contract; regenerate client and Zod types after changes

## Architecture decisions

- Keep the first version read-only and backed by clearly simulated data.
- Suggested actions are static prompts for human review, not AI-generated recommendations.
- PayPal integration is Sandbox-only and read-only; all API credentials and access tokens remain on the server.
- PayPal API failures return the existing simulated cases only with an explicit `simulated_fallback` source marker.
- Do not add payment-provider connectivity, claim acceptance, refunds, or evidence submission without a new explicit product request.

## Product

The dashboard summarizes open demo cases, exposure, deadlines, and resolved demo cases. Sellers can browse cases, inspect details and evidence checklists, and view simulated activity. PayPal Sandbox status and disputes are available through read-only API endpoints; the dashboard does not present demo cases as PayPal disputes.

## User preferences

Keep the app responsive, professional, and easy to extend. Make demo data explicit and avoid implying predictions or real payment actions.

## Gotchas

- The API runs without a database; all case and activity records are in memory and reset when the server restarts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
