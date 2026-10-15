# Dispute Defense Agent

A demo dispute-review dashboard for small online sellers, backed by an Express API with simulated in-memory cases.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dispute-defense-agent run dev` — run the React web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `GET /api/health` — API health check
- No payment-provider account, AI service, or database is required for the demo dataset.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dispute-defense-agent` — React, TypeScript, and Tailwind web dashboard
- `artifacts/api-server/src/lib/demo-disputes.ts` — in-memory sample cases and activity
- `artifacts/api-server/src/routes` — health, dispute, summary, and activity endpoints
- `lib/api-spec/openapi.yaml` — API contract; regenerate client and Zod types after changes

## Architecture decisions

- Keep the first version read-only and backed by clearly simulated data.
- Suggested actions are static prompts for human review, not AI-generated recommendations.
- Do not add payment-provider connectivity, claim acceptance, refunds, or evidence submission without a new explicit product request.

## Product

The dashboard summarizes open cases, exposure, deadlines, and resolved demo cases. Sellers can browse cases, inspect details and evidence checklists, and view simulated activity.

## User preferences

Keep the app responsive, professional, and easy to extend. Make demo data explicit and avoid implying predictions or real payment actions.

## Gotchas

- The API runs without a database; all case and activity records are in memory and reset when the server restarts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
