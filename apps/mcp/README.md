# ArcPay Arbitrum MCP

Local MCP server for ArcPay Arbitrum. It exposes safe developer tools for Arbitrum Sepolia deployments, x402 payment gates, invoice IDs, claim hashes, privacy commitments, and repeatable demo paths.

## Install

```bash
npm install -g @arcpaylabs/arbitrum-mcp
```

## Claude Desktop

Add this to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "arcpay-arbitrum": {
      "command": "arcpay-arbitrum-mcp"
    }
  }
}
```

Restart Claude Desktop after editing the config.

## Tools

- `get_deployment`
- `derive_agent_id`
- `derive_invoice_id`
- `derive_claim_hash`
- `derive_privacy_commitment`
- `privacy_intent_guide`
- `invoice_guide`
- `x402_guide`
- `Arbitrum execution_handoff`
- `demo_path`
- `smoke_commands`

## Hosted Surfaces

- App: https://arcpay-arbitrum.vercel.app
- Docs: https://arcpay-arbitrum.vercel.app/docs/overview
- OpenAPI: https://arcpay-arbitrum.vercel.app/openapi.json
- llms.txt: https://arcpay-arbitrum.vercel.app/llms.txt
- x402: https://arbitrum-x402.20.208.46.195.nip.io

The MCP server does not sign transactions or mutate treasury state. It only returns deterministic IDs, integration guidance, and public deployment metadata.
