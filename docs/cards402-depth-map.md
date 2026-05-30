# Cards402 Depth Map for ArcPay Arbitrum

This repo adapts the strongest Cards402 patterns without copying its
Stellar/card-specific implementation.

| Cards402 pattern | ArcPay Arbitrum implementation |
| --- | --- |
| MCP server | `apps/mcp/server.mjs` exposes deployment lookup, agent ID derivation, claim hash derivation, and demo path. Package-ready as `@arcpaylabs/arbitrum-mcp`. |
| `skill.md` / `llms.txt` | Root files describe how agents, operators, and reviewers should operate the app. |
| x402 HTTP payment gate | `apps/x402-server/server.mjs` returns real `402 Payment Required` quotes, verifies Arbitrum order state, and unlocks agent work after fulfillment. |
| Order state machine | `AgentOrderBook` supports pending, accepted, processing, fulfilled, settled, refunded, and failed. |
| Operator dashboard | Frontend includes dashboard, operator, policies, audit, proofs, agents, and orders pages. |
| Time-window policies | `TreasuryPolicy` enforces hourly, daily, weekly, UTC-hour windows, allowlists, emergency pause, and per-order approvals. |
| Circuit-breaker webhooks | `OperatorControls` tracks per-origin webhook failures and opens a breaker after repeated failures. |
| Agent claim code onboarding | `OperatorControls` creates and redeems expiring claim codes by hash. |
| CLI tool | `apps/cli/arcpay-arbitrum.mjs` supports contracts, wallet, agent ID, claim hash, demo path, and MCP config commands. Package-ready as `@arcpaylabs/arbitrum-cli`. |
| Card-like spend product | `AgentSpendCardVault` creates USDC-backed virtual cards for agent budgets. |
| Privacy layer | `ArbitrumPrivacyVault` creates commitment-based USDC/ETH payment intents with encrypted metadata and nullifier release. |

## Arbitrum-Native Layer

`ArbitrumAgentRiskOracle` is built around a `createRequest`-style agent platform
interface:

```solidity
function createRequest(
  uint256 agentId,
  address callback,
  bytes4 callbackSelector,
  bytes calldata payload
) external payable returns (uint256 requestId);
```

When a live Arbitrum Agent platform contract address is available, set:

```bash
ARBITRUM_AGENT_PLATFORM=0x...
ARBITRUM_RISK_AGENT_ID=...
```

Then redeploy with:

```bash
npm run deploy:arbitrum
```

If those envs are absent, the deploy script uses a mock platform so reviewers can
still run the same request/callback lifecycle locally or on testnet.

Current deployment uses Arbitrum's testnet agent requester:

```text
mock Arbitrum agent platform until a live ZeroDev/agent platform address is provided
```

Default agent ID:

```text
13174292974160097713
```

The reviewer-verifiable smoke path exercises this integration with the deployed
platform deposit, an on-chain `RiskRequested` event, and owner demo fulfillment:

```bash
npm run smoke:live
npm run smoke:x402
```
