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
- ERC-8004-style agent identity records give each service a durable on-chain
  identity, endpoint, trust model, and reputation nonce
- GMX, ZeroDev, Dune, Fhenix, Stylus, Robinhood Chain, and manual execution
  paths all pass through an on-chain `ArbitrumExecutionRouter` intent lifecycle
- GMX is configured with official Arbitrum Sepolia contract addresses and a
  policy-gated swap/hedge manifest on `/swaps`
- ZeroDev sponsored execution is not only listed as an adapter; the dashboard
  embeds the configured sponsor policy, Kernel smart account, live sponsored
  Arbitrum Sepolia transaction, and copyable agent handoff payload
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
9. Agent owner registers an ERC-8004-style identity in `AgentIdentity8004`.
10. Operator proposes, approves, and records adapter execution evidence through
    `ArbitrumExecutionRouter`.
11. Operator can open `Execution`, load the ZeroDev sponsored smart account,
    copy the policy-bound agent handoff, and verify the proof transaction on
    Arbiscan.

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
- `AgentIdentity8004.sol`: ERC-8004-style agent identity metadata, endpoint,
  trust model, active state, and reputation nonce
- `ArbitrumExecutionRouter.sol`: on-chain execution evidence lifecycle for GMX,
  ZeroDev, Stylus, Dune, Fhenix, Robinhood Chain, and manual signers
- `apps/x402-server`: HTTP 402 quote, verification, fulfillment helper, and unlock surface

## Deployment

Arbitrum Sepolia deployment metadata:

```text
deployments/arbitrum-sepolia.json
```

| Contract | Address |
| --- | --- |
| `AgentRegistry` | `0x5F5b8109c832BB6609178F0bb2e6A597387dA17E` |
| `TreasuryPolicy` | `0x3F8bc2b46E7b71632CdADd1f00d4FD6BB11d8283` |
| `AgentTreasury` | `0xe472A6367ab66C271aa47cA5882E919c0DEA0ff2` |
| `AgentOrderBook` | `0x3587fd962d40433165d5f2a3dFc60636ebD11e59` |
| `OperatorControls` | `0x0cbafFF48ac25178bd10D1cE851C04CCa4Fe387e` |
| `ArbitrumAgentRiskOracle` | `0x176018C6C8c445807FE3688f463487E4b01C8ae3` |
| `AgentSpendCardVault` | `0x7C7304bC2D7bB39800eFE7Cdd9c79C7Afd04acF0` |
| `ArbitrumPrivacyVault` | `0xCBa6Fa24a02F11fE0cd9F16B50e883fE1B4D40Eb` |
| `AgentInvoiceBook` | `0x487CbD73e298721a83ff460Eb56645C61BEb0f79` |
| `AgentReputationBook` | `0xDdbe6aD2652BD5d0Ab4D8a6D2ab8798Cf294D9dD` |
| `AgentIdentity8004` | `0xA6c4C9c5479553450F60663E5D8046f9E2CBF37D` |
| `ArbitrumExecutionRouter` | `0x463152158F32aFeedCe58a6BbD19F8ECfA702d8e` |

## Judging Alignment

- Technical depth: Solidity contracts, x402 gateway, worker indexing, MCP/CLI,
  ZeroDev smart-account sponsorship, and a full wallet-first frontend
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
- ERC-8004-style agent identities for agent service trust, discovery, and reputation continuity
- on-chain execution intents for GMX, ZeroDev, Stylus, Dune, Fhenix, Robinhood Chain, and manual signer evidence
- GMX Arbitrum Sepolia adapter surface with `ExchangeRouter`, `Router`,
  `Reader`, `DataStore`, `OrderVault`, and `EventEmitter` config
- live GMX classic SDK execution proof for WETH -> USDC.SG:
  create-order tx `0x9c0dbcfd7d89d4bc837d8bcc3c788b7d7269e750a2ecabaee802a8b61cffb829`,
  execution tx `0xd3f5a9ddadf187742068badf2295e540e19c09e859983d36f30adbb454ee45e9`,
  proof JSON `/proofs/arbitrum-gmx-live-proof.json`
- embedded ZeroDev operator console with sponsor policy status, smart account,
  transaction proof, target contract, and proof JSON at
  `/proofs/arbitrum-zerodev-sponsored-userop.json`
