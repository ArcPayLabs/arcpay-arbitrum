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

## ZeroDev Sponsorship Policy

ArcPay exposes a ZeroDev webhook for policy-gated gas sponsorship:

```text
https://arcpay-arbitrum.vercel.app/api/zerodev/sponsor-policy
```

Recommended ZeroDev dashboard setup:

- Chain limits: Arbitrum Sepolia, with a low daily sponsored gas cap for beta/demo wallets.
- Contract limits: allow only the deployed ArcPay contracts and Circle USDC on Arbitrum Sepolia.
- Wallet limits: add only the funded test wallet and approved beta wallets.
- Webhook: set the URL above, timeout `5000`, enable live mode, and do not process the transaction if the webhook fails.
- If the ZeroDev dashboard does not allow custom headers, use `https://arcpay-arbitrum.vercel.app/api/zerodev/sponsor-policy?token=<ZERODEV_WEBHOOK_SECRET>`.

Required env:

```bash
ZERO_DEV_PROJECT_ID=
ZERODEV_API_KEY=
ZERODEV_RPC_URL=https://rpc.zerodev.app/api/v3/<project-id>/chain/421614
ZERODEV_ALLOWED_WALLETS=0x...
ZERODEV_MAX_NATIVE_VALUE_ETH=0.0005
ZERODEV_MAX_TOKEN_AMOUNT=1
ZERODEV_WEBHOOK_SECRET=
ZERODEV_WEBHOOK_LIVE=true
```

The webhook rejects unknown chain IDs, unknown target contracts, native value above the configured cap, unknown function selectors, and USDC approvals/transfers above the configured token cap.

Live ZeroDev proof:

- Dashboard: `https://arcpay-arbitrum.vercel.app/execution`
- Proof JSON: `https://arcpay-arbitrum.vercel.app/proofs/arbitrum-zerodev-sponsored-userop.json`
- Sponsored transaction: `https://sepolia.arbiscan.io/tx/0xd075f82ec005b663f29c19996aa63c1b5001c54779fac936ffa8f12aaef050ae`

The `/execution` dashboard embeds the ZeroDev smart account, sponsor webhook readiness, gas policy posture, proof transaction, target contract, agent slug, and copyable agent handoff payload.

## Dune Evidence

Set `DUNE_API_KEY` server-side only. Do not expose it through `NEXT_PUBLIC_*`.

For local agent work, add Dune MCP:

```bash
codex mcp add dune_prod --url "https://api.dune.com/mcp/v1?api_key=$DUNE_API_KEY"
```

ArcPay uses Dune as the public evidence layer for Arbitrum activity: deployed contract events, x402 order lifecycle, execution adapter usage, privacy intent events, invoice/card activity, and reputation history.

Public Dune evidence:

- Query: `https://dune.com/queries/7623300`
- App surface: `/execution`
- Env override: `DUNE_EVIDENCE_QUERY_ID=7623300`

This query is a public evidence register for the Arbitrum Sepolia proof set. Dune docs expose Arbitrum One event tables clearly; until dependable Arbitrum Sepolia event tables are verified, ArcPay uses Dune for public proof registration and keeps Sepolia event reconciliation in the ArcPay worker/API.

## GMX Arbitrum Sepolia Adapter

ArcPay exposes GMX as a policy-gated execution adapter, not an unrestricted trading bot.

- App surface: `/swaps`
- Status endpoint: `/api/gmx/status`
- Official GMX contracts reference: `https://docs.gmx.io/docs/api/contracts/addresses/`
- SDK reference: `https://docs.gmx.io/docs/sdk/v2/`

Current adapter behavior:

- loads official GMX Arbitrum Sepolia contract addresses including `ExchangeRouter`, `Router`, `Reader`, `DataStore`, `OrderVault`, and `EventEmitter`
- executes the live-tested GMX classic SDK path for a WETH -> USDC.SG market swap on Arbitrum Sepolia
- builds a copyable GMX execution manifest with route, budget, slippage, policy, SDK method, and evidence requirements
- requires ArcPay policy and operator approval before leverage or treasury execution
- refuses to mark a GMX action complete without Arbiscan transaction evidence and Dune/worker audit evidence

Live GMX proof:

- Create-order tx: `0x9c0dbcfd7d89d4bc837d8bcc3c788b7d7269e750a2ecabaee802a8b61cffb829`
- Execution tx: `0xd3f5a9ddadf187742068badf2295e540e19c09e859983d36f30adbb454ee45e9`
- Proof JSON: `/proofs/arbitrum-gmx-live-proof.json`

Optional env for repeating SDK-backed execution:

```bash
GMX_API_BASE_URL=https://gmx-api-arbitrum-sepolia-yp6pp.ondigitalocean.app/v1
GMX_TEST_WETH_AMOUNT=0.001
GMX_CLASSIC_GAS_LIMIT=2500000
GMX_EXCHANGE_ROUTER_ADDRESS=0xEd50B2A1eF0C35DAaF08Da6486971180237909c3
GMX_READER_ADDRESS=0x4750376b9378294138Cf7B7D69a2d243f4940f71
GMX_DATASTORE_ADDRESS=0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201
```

Run the proof script with `npm run proof:gmx`. Express mode is not used because the public GMX/Gelato relay path returned `401 Unauthorized`; ArcPay uses the direct classic wallet transaction path instead.

## Fhenix CoFHE Privacy Proof

ArcPay uses Fhenix CoFHE on Arbitrum Sepolia for confidential treasury policy metadata.

- App surface: `/privacy`
- Status endpoint: `/api/fhenix/status`
- CoFHE docs: `https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start`
- CoFHE task manager: `0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9`
- Live policy vault: `0xC9e4a3f86FD0771f657eA5dFE01d9E0e726e30D1`
- Deploy tx: `0xf35c22d52c88452cb9dbf8811faaa3f3014b2dce2efc02e5840612ec4fa1133d`
- Confidential policy record tx: `0x988ba57a8bd2d3ec0167a306ed7a6b910bc504d5cf51d6568e2edcc9511cfd1a`
- Proof JSON: `/proofs/arbitrum-fhenix-live-proof.json`

Run the proof script with `npm run proof:fhenix`. It deploys `ArbitrumFhenixPolicyVault`, records encrypted spend/limit/approval handles through CoFHE, and publishes proof JSON for app and submission evidence.

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
- ZeroDev sponsorship is configured with a live webhook policy and a sponsored Arbitrum Sepolia UserOp proof embedded in the dashboard.
- Solidity contracts, frontend, Vercel x402 API, standalone x402 server, worker, CLI, MCP, docs, OpenAPI, and starter kit are present.
- Local proof capture has passed against the deployed contracts and x402 flow.
- Final browser wallet QA and Vercel redeploy verification should be completed before submission.
