# ArcPay Arbitrum MCP

ArcPay Arbitrum MCP is ArcPay for AI agents. Claude Desktop, Codex-compatible hosts, and other MCP clients can ask ArcPay for Arbitrum deployment data, derive agent and invoice IDs, prepare x402 paid-resource flows, generate privacy/invoice instructions, build GMX/ZeroDev/Dune/Fhenix execution handoff payloads, and return evidence checklists before claiming any work is complete.

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
- `execution_handoff`
- `gmx_execution_plan`
- `zerodev_session_policy`
- `dune_evidence_spec`
- `fhenix_privacy_boundary`
- `demo_path`
- `smoke_commands`

## Hosted Surfaces

- App: https://arcpay-arbitrum.vercel.app
- Docs: https://arcpay-arbitrum.vercel.app/docs/overview
- OpenAPI: https://arcpay-arbitrum.vercel.app/openapi.json
- llms.txt: https://arcpay-arbitrum.vercel.app/llms.txt
- x402: https://arcpay-arbitrum.vercel.app/api

The MCP server makes ArcPay usable by agents directly, not only by humans clicking a dashboard. It does not sign transactions or mutate treasury state; it returns deterministic IDs, integration guidance, handoff payloads, and public deployment metadata that an operator can verify before execution.
