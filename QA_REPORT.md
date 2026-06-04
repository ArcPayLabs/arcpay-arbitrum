# ArcPay Arbitrum QA Report

Generated: 2026-06-04

## Automated Browser QA

- Public app: https://arcpay-arbitrum.vercel.app
- API checks: 13 / 13 passed
- Browser route checks: 24 / 24 passed
- Viewports: desktop 1440x1000, mobile 390x844
- Screenshot artifacts: `C:\Users\RICHEY_SON\Desktop\arcpay-qa-artifacts-rerun\arbitrum`

## Routes Checked

- `/`
- `/sign-in`
- `/beta`
- `/status`
- `/agents`
- `/x402`
- `/execution`
- `/privacy`
- `/swaps`
- `/yield`
- `/analytics`
- `/dashboard`

Each route loaded on desktop and mobile without detected horizontal overflow.

## API Surfaces Checked

- `/.well-known/agent-skills/index.json`
- `/.well-known/mcp/server-card.json`
- `/.well-known/api-catalog`
- `/api/status`
- `/api/integrations`
- `/api/gmx/status`
- `/api/fhenix/status`
- `/api/zerodev/sponsor-policy`
- `/api/x402/health`
- `/platform/v2/x402/discovery/resources`
- `/openapi.json`
- `/llms.txt`
- `/auth.md`

## Live Product Notes

- Arbitrum x402 gateway, payment requirements, verification, provider fulfillment, and protected resource routes are live through Vercel APIs.
- x402 responses expose ArcPay orderbook payment proof headers plus `PAYMENT-REQUIRED`, `X-ACCEPT-PAYMENT`, `PAYMENT-RESPONSE`, and `X-PAYMENT-RESPONSE` aliases for agent/client compatibility.
- GMX, ZeroDev, Dune, and Fhenix surfaces are represented as policy/evidence integrations in `/execution`, `/swaps`, `/yield`, and status APIs.
- Agent-ready metadata is live through API catalog, MCP card, agent-skills, markdown negotiation, OpenAPI, and `llms.txt`.

## Manual Wallet QA Still Required

The automated pass does not click wallet extension prompts. Manual wallet QA should cover:

1. Connect funded Arbitrum Sepolia wallet.
2. Create or load workspace.
3. Register an agent.
4. Create and verify x402 order evidence.
5. Prepare GMX/ZeroDev/Fhenix execution evidence.
6. Create privacy, swap/yield, invoice/card records.
7. Confirm records appear in audit/status views.
