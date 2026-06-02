# ArcPay Arbitrum CLI

ArcPay Arbitrum CLI is the operator kit for wiring an agent into ArcPay without using the frontend. It helps builders register deterministic agent IDs, inspect deployed Arbitrum contracts, prepare invoice IDs and privacy commitments, generate x402 payment instructions, build GMX/ZeroDev/Dune/Fhenix execution handoff payloads, and print exact smoke-test commands for proving the integration works on Arbitrum Sepolia.

## Install

```bash
npm install -g @arcpaylabs/arbitrum-cli
```

## Commands

```bash
arcpay-arbitrum contracts
arcpay-arbitrum wallet
arcpay-arbitrum agent-id research-agent
arcpay-arbitrum invoice-id inv_001
arcpay-arbitrum claim-hash claim-research-agent-001
arcpay-arbitrum privacy-commit "invoice-secret"
arcpay-arbitrum privacy-guide
arcpay-arbitrum invoice-guide
arcpay-arbitrum x402-guide
arcpay-arbitrum execution-handoff
arcpay-arbitrum gmx-plan
arcpay-arbitrum zerodev-policy
arcpay-arbitrum dune-spec
arcpay-arbitrum fhenix-boundary
arcpay-arbitrum demo-path
arcpay-arbitrum smoke
arcpay-arbitrum mcp-config
```

## Live Surfaces

- App: https://arcpay-arbitrum.vercel.app
- Docs: https://arcpay-arbitrum.vercel.app/docs/overview
- x402: https://arcpay-arbitrum.vercel.app/api
- OpenAPI: https://arcpay-arbitrum.vercel.app/openapi.json

The CLI is part of ArcPay's developer distribution layer. It does not hold private keys or sign treasury transactions; it prepares the IDs, payloads, guides, and verification steps an operator or agent team needs before sending a transaction.
