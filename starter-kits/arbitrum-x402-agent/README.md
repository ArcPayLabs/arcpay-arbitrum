# ArcPay Arbitrum x402 Agent Starter

This starter is the plug-and-play client for Arbitrum agent builders who want to sell or consume paid agent work through ArcPay. Point it at ArcPay's live Arbitrum x402 server, request a protected resource, read the HTTP 402 quote, verify an order, and unlock the result after payment evidence exists.

It covers:

- reading a payment quote
- requesting a protected agent resource
- checking HTTP 402 requirements
- verifying an order id
- deriving the agent id locally

It does not hold private keys by default. Wallet payment is intentionally left to your app, operator wallet, smart account, or agent wallet so teams can plug it into their own custody model.

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
https://arcpay-arbitrum.vercel.app/api
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
