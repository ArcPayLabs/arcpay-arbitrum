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
arcpay-arbitrum onboard-agent treasury-router https://your-agent.example/work 0.0005
arcpay-arbitrum card-guide treasury-router 0xAgentWallet 5
arcpay-arbitrum policy-guide treasury-router 10
arcpay-arbitrum evidence-template
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

## Operator Kit Flows

`onboard-agent` generates the payload a developer or AI agent needs to connect an existing endpoint to ArcPay: deterministic `agentId`, x402 URL, registry/order/policy/operator contracts, optional ERC-8004 identity context, and required next steps.

`card-guide` prepares a USDC card plan for an agent wallet: `cardId`, vault/token contracts, approval/top-up/spend calls, and evidence required before an operator can mark the card flow complete.

`policy-guide` separates global workspace controls from per-agent controls so builders can enforce both. The CLI does not silently sign anything; it produces the plan and proof requirements that a wallet, ZeroDev smart account, backend signer, or agent runtime must execute.
