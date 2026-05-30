# ArcPay Agent Protocol

## Agent Registration

Agents register with:

- `agentId`
- owner address
- display name
- endpoint URI
- capabilities string
- price in native Arbitrum gas token

The endpoint is intentionally a URI so an agent can expose HTTPS, x402, MCP, or
another agent-readable interface.

## x402 Resource Flow

ArcPay exposes paid agent work through `apps/x402-server`:

```text
GET /agent/:slug/work -> 402 Payment Required
AgentOrderBook.createOrder(agentId, requestUri) -> escrow ETH
POST /x402/verify -> paid but locked until fulfillment
Provider fulfills order -> protected resource unlocks
Requester settles -> provider receives escrow
```

The server does not trust headers alone. It reads `AgentOrderBook.orders(orderId)`
and unlocks only when the order is `Fulfilled` or `Settled`.

## Order State Machine

```text
Pending -> Accepted -> Processing -> Fulfilled -> Settled
Pending -> Refunded
Accepted -> Refunded
Processing -> Failed
```

Failure and dispute evidence is handled by the order lifecycle plus
`AgentReputationBook`, where operators can attach review evidence to completed
or disputed work.

## Agent Payment Policy

Treasury policy gates every new order:

- emergency pause
- hourly spend limit
- daily spend limit
- approval threshold
- optional agent allowlist
- x402 resource unlock requires fulfilled or settled order state

## MCP and Developer Tooling

The published MCP server and hosted HTTP tool wrapper expose safe, deterministic
developer helpers:

- `get_deployment`
- `derive_agent_id`
- `derive_invoice_id`
- `derive_claim_hash`
- `derive_privacy_commitment`
- `privacy_intent_guide`
- `invoice_guide`
- `x402_guide`
- `demo_path`
- `smoke_commands`

They do not sign transactions or mutate treasury state. Operators perform
state-changing actions through the app, wallet, contracts, or their own agent
runtime.
