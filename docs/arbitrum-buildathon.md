# ArcPay Arbitrum Buildathon Plan

## Thesis

ArcPay Arbitrum is an AI-agent treasury, RWA operations, and paid-service network
for Arbitrum. Agents register capabilities, discover one another, request work,
escrow payment, complete jobs, and settle under programmable treasury policy.

## Why Arbitrum

The Turing Test Hackathon asks builders to deploy autonomous agents on Arbitrum,
record decisions on-chain, and show real ecosystem contribution. ArcPay uses
Arbitrum as the settlement and evidence layer for agent financial operations:

- agents are first-class service providers and treasury operators
- agent-to-agent orders are onchain
- x402 endpoints monetize agent work over HTTP
- USDC/WETH strategy intents connect agent finance to Arbitrum RWA themes
- Arbitrum execution-style agent workflows can call ArcPay tools for payment,
  policy, invoices, and reputation
- treasury spend policies are enforced before settlement
- every job creates an auditable order lifecycle

## MVP Flow

1. Agent owner registers an agent in `AgentRegistry`.
2. Operator configures hourly/daily treasury policy in `TreasuryPolicy`.
3. Operator allowlists an agent if allowlist mode is enabled.
4. Requester creates an escrowed order in `AgentOrderBook`.
5. x402 server verifies the paid order before protected agent work unlocks.
6. Provider accepts, processes, and fulfills the order.
7. Requester settles the order, releasing funds through `AgentTreasury`.
8. Dashboard, audit, and proof pages show the order lifecycle and contract events.

## Arbitrum Sepolia

| Field | Value |
| --- | --- |
| Chain ID | `421614` / `0x66eee` |
| Currency | `ETH` |
| Block gas limit | `499999998` |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Explorer | `https://sepolia.arbiscan.io` |

## Contracts

- `AgentRegistry.sol`: agent identity, endpoint, capabilities, price, active state
- `TreasuryPolicy.sol`: hourly/daily spend limits, approval threshold, allowlist, emergency pause
- `AgentTreasury.sol`: escrow and settlement
- `AgentOrderBook.sol`: order state machine
- `AgentInvoiceBook.sol`: ETH/USDC invoice lifecycle
- `OperatorControls.sol`: claim-code onboarding and webhook circuit breakers
- `ArbitrumAgentRiskOracle.sol`: agent risk request/callback evidence
- `AgentSpendCardVault.sol`: USDC agent budget cards
- `ArbitrumPrivacyVault.sol`: commitment-based privacy intents
- `AgentReputationBook.sol`: order-backed agent reputation
- `apps/x402-server`: HTTP 402 quote, verification, fulfillment helper, and unlock surface

## Deployment

Arbitrum Sepolia deployment metadata:

```text
deployments/arbitrum-sepolia.json
```

| Contract | Address |
| --- | --- |
| `AgentRegistry` | Pending Arbitrum Sepolia deploy |
| `TreasuryPolicy` | Pending Arbitrum Sepolia deploy |
| `AgentTreasury` | Pending Arbitrum Sepolia deploy |
| `AgentOrderBook` | Pending Arbitrum Sepolia deploy |
| `OperatorControls` | Pending Arbitrum Sepolia deploy |
| `ArbitrumAgentRiskOracle` | Pending Arbitrum Sepolia deploy |
| `AgentSpendCardVault` | Pending Arbitrum Sepolia deploy |
| `ArbitrumPrivacyVault` | Pending Arbitrum Sepolia deploy |
| `AgentInvoiceBook` | Pending Arbitrum Sepolia deploy |
| `AgentReputationBook` | Pending Arbitrum Sepolia deploy |

## Judging Alignment

- Technical depth: Solidity contracts, x402 gateway, worker indexing, MCP/CLI,
  and a full wallet-first frontend
- Innovation: agent treasury policy, paid HTTP agent work, privacy intents, and
  order-backed reputation in one Arbitrum-native product
- Arbitrum contribution: ETH escrow, USDC/WETH strategy intents, Arbitrum Sepolia
  deployment, and reusable developer tools for Arbitrum agents
- Product completeness: live UI, docs, smoke tests, and demo path

## Product Surface

The UI is not a standalone toy page. It ports the ArcPay treasury operating
system into a Arbitrum-only testnet app:

- wallet-first onboarding through EVM wallet switching to chain `421614`
- agent discovery and service pricing through live Arbitrum contracts
- x402-style paid agent endpoints that quote exact ETH requirements and unlock after on-chain fulfillment
- escrowed agent orders with explicit lifecycle actions
- real policy enforcement before order creation
- direct ETH payouts for operator-controlled payments
- local invoices, contractors, audit logs, and proof pages for a complete demo
- claim-code onboarding and webhook circuit-breaker controls
- Arbitrum `createRequest`-compatible risk oracle for agentic policy decisions
- USDC-backed agent spend cards with limits, balances, spend events, and freeze controls
- commitment-based private payment intents with encrypted metadata and nullifier release
