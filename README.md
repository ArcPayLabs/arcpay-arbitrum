# ArcPay Arbitrum

ArcPay Arbitrum is an agent-native treasury and autonomous service payment system for AI-agent businesses on Arbitrum.

It gives operators one control layer for agent discovery, x402 paid work, escrowed orders, policy enforcement, privacy intents, USDC invoices, agent spend cards, reputation, audit records, and Arbitrum execution evidence.

## Source Use

This repository is source-available for evaluation, review, and contribution. The full ArcPay Arbitrum product is not licensed for unauthorized commercial copying, rebranding, or redeployment. See `LICENSE.md` and `NOTICE.md`.

The x402 starter kit under `starter-kits/arbitrum-x402-agent` is separately licensed under MIT so Arbitrum builders can reuse it freely.

## Product Focus

- Agent discovery and service registration.
- Agent-to-agent paid work through HTTP 402/x402.
- Escrowed order lifecycle from pending to settled or refunded.
- Time-window treasury policy with approval thresholds and allowlists.
- Privacy intents for delayed recipient disclosure.
- ETH and USDC invoices.
- USDC agent spend cards.
- Reputation, audit, and usage analytics.
- ERC-8004-style agent identity records.
- Arbitrum execution router for GMX, Stylus, ZeroDev, Dune evidence, Fhenix privacy boundary, Robinhood Chain path, and manual signer flows.
- CLI, MCP, OpenAPI, hosted developer tools, and a reusable x402 starter kit.

## Network

| Field | Value |
| --- | --- |
| Network | Arbitrum Sepolia |
| Chain ID | `421614` / `0x66eee` |
| Native token | ETH |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Explorer | `https://sepolia.arbiscan.io` |

## Contracts

| Contract | Purpose |
| --- | --- |
| `AgentRegistry.sol` | Register agent identity, endpoint, capability, price, and active state. |
| `TreasuryPolicy.sol` | Enforce hourly/daily/weekly limits, approval threshold, UTC windows, allowlist, and emergency pause. |
| `AgentTreasury.sol` | Escrow and release native ETH for agent orders. |
| `AgentOrderBook.sol` | Agent order state machine from pending to settled/refunded. |
| `AgentInvoiceBook.sol` | ETH/USDC invoice creation, payment, cancellation, and settlement evidence. |
| `OperatorControls.sol` | Agent claim-code onboarding and webhook circuit-breaker controls. |
| `ArbitrumAgentRiskOracle.sol` | Testnet risk request/callback flow for treasury policy decisions. |
| `AgentSpendCardVault.sol` | USDC-backed virtual spend cards for agent budgets. |
| `ArbitrumPrivacyVault.sol` | Commitment-based payment intents with encrypted memo URIs and nullifier release. |
| `AgentReputationBook.sol` | Order-backed score, review, and dispute evidence for service agents. |
| `AgentIdentity8004.sol` | ERC-8004-style identity record for agent metadata, endpoint, trust model, active state, and reputation nonce. |
| `ArbitrumExecutionRouter.sol` | On-chain execution intent lifecycle for GMX, ZeroDev, Stylus, Dune, Fhenix, Robinhood Chain, and manual evidence. |

## Local Setup

```bash
npm install
npm run install:frontend
npm run install:mcp
npm run install:worker
npm run install:x402
npm run build
npm test
npm run build:frontend
```

Run the app:

```bash
npm run dev:frontend
```

## CLI And MCP

Local CLI:

```bash
npm run arcpay -- contracts
npm run arcpay -- wallet
npm run arcpay -- agent-id research-agent
npm run arcpay -- privacy-guide
npm run arcpay -- x402-guide
npm run arcpay -- execution-handoff
npm run arcpay -- gmx-plan
npm run arcpay -- zerodev-policy
npm run arcpay -- dune-spec
npm run arcpay -- fhenix-boundary
npm run arcpay -- demo-path
npm run arcpay -- mcp-config
```

Package commands after npm publish:

```bash
npm install -g @arcpaylabs/arbitrum-cli
npm install -g @arcpaylabs/arbitrum-mcp
npm install -g @arcpaylabs/arbitrum-x402-agent-starter

arcpay-arbitrum contracts
arcpay-arbitrum execution-handoff
arcpay-arbitrum gmx-plan
arcpay-arbitrum zerodev-policy
arcpay-arbitrum-mcp
arcpay-arbitrum-x402-agent quote research-agent
```

## Deploy

Create `.env` from `.env.example`:

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_CHAIN_ID=421614
ARBITRUM_EXPLORER_URL=https://sepolia.arbiscan.io
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
ARBISCAN_API_KEY=your_arbiscan_or_etherscan_v2_key
```

Deploy and verify:

```bash
npm run deploy:arbitrum
npm run verify:arbitrum
```

The deployment script rewrites `deployments/arbitrum-sepolia.json`. The committed deployment file contains the current Arbitrum Sepolia contract addresses and Circle USDC testnet address.

## x402 Server

ArcPay exposes x402 through the deployed Vercel API surface:

```text
https://arcpay-arbitrum.vercel.app/api
```

The standalone Node gateway is still available for local development:

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
X402_SERVER_PORT=4032
X402_PROVIDER_PRIVATE_KEY=0x...
X402_ADMIN_SECRET=...
npm run x402
```

ArcPay's x402 rail follows the HTTP `402 Payment Required` pattern: request a protected agent resource, receive exact payment requirements, pay on-chain, retry with payment proof, and unlock the resource. On Arbitrum Sepolia the proof is a fulfilled `AgentOrderBook` escrow order ID.

## Persistence

Wallet sessions work without Supabase. To persist audit records in Vercel, run the Supabase migrations in `supabase/migrations` and set:

```bash
ARCPAY_SESSION_SECRET=...
ARCPAY_RECORDS_TABLE=arcpay_arbitrum_records
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ARCPAY_ADMIN_WALLETS=...
```

Usage analytics uses `supabase/migrations/202605280001_arbitrum_usage_events.sql`.

## Worker

The worker reconciles Arbitrum events into Supabase-backed audit records:

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARCPAY_ROOT=/home/arcpay/arcpay-arbitrum
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ARCPAY_RECORDS_TABLE=arcpay_arbitrum_records
ARCPAY_WORKER_CHECKPOINT_PATH=/home/arcpay/.arcpay-arbitrum-worker-checkpoint.json
npm run worker
```

One-shot check:

```bash
npm run worker:once
```

## Proofs

After deployment, capture a full Arbitrum Sepolia proof:

```bash
npm run proof:arbitrum
```

That writes `proofs/arbitrum-live-proof.json` with deployment, x402, privacy, invoice, order, and execution evidence. Do not submit copied hashes from another chain.

## Docs

Mintlify docs are configured at repo root through `docs.json`.

Important files:

- `overview.mdx`
- `arbitrum-contracts.mdx`
- `arbitrum-execution-adapters.mdx`
- `arbitrum-defi-agent-intents.mdx`
- `x402-agent-payments.mdx`
- `privacy-intents.mdx`
- `mcp.mdx`
- `cli.mdx`
- `apps/frontend/public/openapi.json`
- `apps/frontend/public/llms.txt`

## Frontend Routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Deployment overview, contract links, runtime status, recent records. |
| `/agents` | Register and load Arbitrum agent services from `AgentRegistry`. |
| `/orders` | Create, accept, process, fulfill, settle, or refund escrowed agent orders. |
| `/x402` | Quote HTTP 402 payment requirements, create an escrowed order, verify, fulfill, and unlock paid agent work. |
| `/execution` | Propose, approve, and record policy-bound Arbitrum execution intents for GMX, ZeroDev, Stylus, Dune, Fhenix, Robinhood Chain, or manual signers. |
| `/cards` | Create USDC-backed agent spend cards with limits and freeze controls. |
| `/policies` | Set hourly/daily/weekly limits, approval threshold, UTC-hour windows, emergency pause, and agent allowlist. |
| `/privacy` | Create and release commitment-based USDC/ETH payment intents with encrypted metadata and nullifiers. |
| `/operator` | Claim-code onboarding and webhook circuit-breaker controls. |
| `/oracle` | Arbitrum agent risk request/callback flow. |
| `/payments` | Wallet-signed direct ETH payments for operator payouts. |
| `/invoices` | Create, pay, cancel, and sync ETH/USDC invoices through `AgentInvoiceBook`. |
| `/swaps` | Arbitrum swap intent builder for GMX, ZeroDev, Stylus, Dune evidence, or manual signer execution. |
| `/yield` | Arbitrum USDC/WETH strategy intent builder with allocation and drawdown controls. |
| `/audit` | Workflow records and transaction hashes. |
| `/analytics` | Admin usage analytics. |
| `/proofs` | Deployment proof and local verification commands. |

## Current Status

- Arbitrum Sepolia contracts are deployed and verified on Arbiscan.
- Circle Arbitrum Sepolia USDC is configured as the live USDC token for cards and invoices.
- Solidity contracts, frontend, Vercel x402 API, standalone x402 server, worker, CLI, MCP, docs, OpenAPI, and starter kit are present.
- Local proof capture has passed against the deployed contracts and x402 flow.
- Final browser wallet QA and Vercel redeploy verification should be completed before submission.
