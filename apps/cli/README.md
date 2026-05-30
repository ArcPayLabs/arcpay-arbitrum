# ArcPay Arbitrum CLI

Developer CLI for ArcPay Arbitrum. It prints deployed contract addresses, derives IDs used by the contracts, returns integration guides, and generates MCP config.

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

The CLI is a developer helper. It does not hold private keys or sign treasury transactions.
