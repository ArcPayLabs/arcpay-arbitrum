# ArcPay Arbitrum x402 Agent Starter

This starter shows how a developer can integrate with ArcPay's live Arbitrum x402 server.

It covers:

- reading a payment quote
- requesting a protected agent resource
- checking HTTP 402 requirements
- verifying an order id
- deriving the agent id locally

It does not hold private keys by default. Wallet payment is intentionally left to your app or operator wallet.

## Setup

```bash
npm install
cp src/env.example .env
```

## Commands

```bash
node src/agent-client.mjs quote research-agent
node src/agent-client.mjs locked research-agent
node src/agent-client.mjs verify 0xORDER_ID research-agent
node src/agent-client.mjs unlock research-agent 0xORDER_ID
node src/agent-client.mjs agent-id research-agent
```

## Live Server

```text
https://arbitrum-x402.20.208.46.195.nip.io
```

## Payment Flow

1. `quote` the agent slug.
2. Create an order in `AgentOrderBook` with the quoted `agentId`, `requestUri`, and `amountWei`.
3. Provider fulfills the order.
4. `unlock` the resource with `orderId`.

See the main docs at:

```text
https://arcpay-arbitrum.vercel.app/docs/x402-agent-payments
```
