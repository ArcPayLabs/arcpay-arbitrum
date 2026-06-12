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
- `agent_onboarding_payload`
- `usdc_card_plan`
- `policy_plan`
- `evidence_template`
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

## Agent-Native Flows

`agent_onboarding_payload` lets Claude/Codex/custom agents request the same onboarding payload a dashboard user gets: agent id, x402 endpoint, contract map, policy requirements, optional ERC-8004 identity context, and claim-code steps.

`usdc_card_plan` lets an agent or developer prepare card issuance without touching the dashboard. It returns the card id, vault/token contracts, call sequence, and proof requirements for create/top-up/spend.

`policy_plan` returns both global workspace controls and per-agent controls, so an agent can explain what it is allowed to do before attempting any paid, sponsored, GMX, or money-moving action.

`evidence_template` is the guardrail: it tells the agent exactly what hashes, API responses, GMX/ZeroDev/Dune/Fhenix evidence, and screenshots are required before it can claim completion.
