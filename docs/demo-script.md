# ArcPay Arbitrum Demo Script

Target length: 3 minutes.

## Core Story

ArcPay is an operating account for autonomous agent businesses on Arbitrum. It gives an operator one place to register agents, enforce spend policy, sell agent work through x402, create invoices, assign USDC spend cards, run privacy-intent payments, and export audit evidence.

The Arbitrum angle is simple: agents are not just users of the app. They are discoverable services with on-chain identity, pricing, escrowed orders, and policy-controlled execution on Arbitrum Sepolia.

## Recording Flow

1. Start on the landing page.
   - Say: "ArcPay turns Arbitrum Sepolia into an agent treasury workspace. It is fixed to chain 421614, so every transaction in this demo is verifiable on the same explorer."
   - Show Product, Security, Pricing, and Docs briefly so the project feels like a real product, not a one-page demo.

2. Open the app and connect the wallet.
   - Show wallet-first entry into the workspace.
   - Say: "The operator signs in with an EVM wallet. The workspace stores user records in Supabase, while critical agent, policy, order, card, invoice, and privacy actions land on Arbitrum."

3. Register an agent.
   - Open `Agents`.
   - Register or load `research-agent`.
   - Say: "The agent registry publishes a service endpoint, capability tags, and ETH price. Other agents or clients can discover the service and know what it costs before calling it."

4. Set policy before moving money.
   - Open `Policies`.
   - Show allowed tokens, allowed networks, spend windows, emergency pause, risk floor, and contractor allowlist.
   - Say: "ArcPay treats policy as a control plane. Payments, cards, invoices, privacy intents, and agent orders are checked before the operator signs."

5. Show live x402.
   - Open `x402`.
   - Use `https://arcpay-arbitrum.vercel.app/api` as the server URL.
   - Quote the resource, create the order, verify it, fulfill it, then unlock the resource.
   - Say: "This is the agent commerce loop: the endpoint returns HTTP 402, the requester pays on Arbitrum, the provider fulfills the order, and the resource unlocks only after on-chain verification."

6. Show the order state machine.
   - Open `Orders`.
   - Load the order from the x402 step or create a fresh order.
   - Say: "Orders move through an explicit lifecycle instead of disappearing into a payment button. That gives operators reconciliation, refunds, settlement, and failure evidence."

7. Create an invoice.
   - Open `Invoices`.
   - Create a small ETH or USDC invoice.
   - Pay or sync it if the wallet has enough testnet balance.
   - Say: "Invoices give agent businesses a normal client-facing workflow while still keeping settlement and status evidence on Arbitrum."

8. Show privacy intents.
   - Open `Privacy`.
   - Create a small ETH or USDC shield intent, then show release/cancel/disclosure controls.
   - Say: "Arbitrum does not have a native privacy layer yet, so ArcPay adds a practical privacy-intent primitive: commitment, encrypted memo URI, delayed recipient release, cancellation, and nullifier evidence."

9. Show embedded ZeroDev execution.
   - Open `Execution`.
   - Show the ZeroDev smart-account panel, sponsor policy readiness, proof transaction, and proof JSON link.
   - Click `Use proof account` so the smart account, target contract, and proof tx populate the execution form.
   - Say: "ArcPay does not treat gas sponsorship as a logo. ZeroDev is embedded as a policy-gated execution path: the smart account is live, sponsorship is constrained by webhook policy, and the proof is tied to an Arbitrum Sepolia transaction."

10. Show cards and contractors.
   - Open `Cards`.
   - Create or load a USDC card and show freeze/activate/top-up controls.
   - Open `Contractors`.
   - Show allowlist, risk score, and payout batch intent.
   - Say: "Operators can give agents and contributors bounded budgets without exposing the whole treasury."

11. Close with audit and docs.
   - Open `Audit`, `Proofs`, then public `Docs`.
   - Say: "The system is not just frontend state. There are deployed contracts, a live Azure x402 server, a Supabase-backed worker, published MCP, CLI, and x402 starter packages, smoke tests, and explorer links for verification."

## Short Closing Line

"ArcPay makes Arbitrum useful for real agent businesses: discover agents, hire them, enforce policy, manage spend, preserve private context, and prove every financial action."

## Operator Verification

Run these locally before recording:

```bash
npm run build:frontend
npm test
npm run check:worker
npm run check:x402
npm run smoke:auth
npm run smoke:live
npm run smoke:x402
```

Check the live x402 backend:

```bash
curl https://arcpay-arbitrum.vercel.app/api/health
curl https://arcpay-arbitrum.vercel.app/api/x402/demo
```

`npm run smoke:live` spends small Arbitrum Sepolia amounts and verifies registry writes, policy, escrowed order lifecycle, operator controls, USDC cards, privacy release, and risk oracle fulfillment.

`npm run smoke:x402` verifies the HTTP 402 quote, on-chain escrow payment, provider fulfillment, resource unlock, and settlement flow.
