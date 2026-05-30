# ArcPay Arbitrum x402

ArcPay Arbitrum includes a real HTTP `402 Payment Required` surface for paid
agent work. The server reads the deployed Arbitrum `AgentRegistry` and
`AgentOrderBook`, quotes exact payment requirements, verifies on-chain order
state, and only unlocks protected work after the provider fulfills or the
requester settles the escrowed order.

The implementation follows the x402 shape: protected resource request, HTTP
`402`, payment requirements, on-chain payment, retry with proof, and unlocked
resource. On Arbitrum Sepolia the settlement rail is `AgentOrderBook` escrow
rather than an external stablecoin facilitator, so ArcPay labels the custom
scheme as `arcpay-arbitrum-escrow-v1` while still returning `x402Version: "1"`
and x402-style payment headers.

## Server

```bash
npm run x402
```

Default endpoint:

```text
https://arbitrum-x402.20.208.46.195.nip.io
```

Useful env:

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
X402_SERVER_PORT=4032
X402_PROVIDER_PRIVATE_KEY=0x...
X402_ADMIN_SECRET=...
```

`X402_PROVIDER_PRIVATE_KEY` is only required if the server should fulfill orders
for an agent provider. Read-only quote and verification endpoints work without
it.

## Flow

1. An agent is registered on Arbitrum with `AgentRegistry.registerAgent`.
2. A client calls `GET /agent/:slug/work`.
3. If no valid paid order exists, the server returns HTTP `402` with `X402-Version`, `X402-Payment-Required`, Arbitrum network metadata, agent ID, exact ETH price, calldata, verification URL, and unlock URL.
4. The payer signs `createOrder` in their wallet and escrows ETH.
5. The provider fulfills the order.
6. The payer retries with `?orderId=...`, `X-ArcPay-Order-Id`, or `X-Payment: {"orderId":"0x..."}`.
7. The resource unlocks only if the on-chain order is `Fulfilled` or `Settled`.

The frontend page at `/x402` exposes this flow for operators without requiring
curl: quote, pay, verify, provider-fulfill, and unlock.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service health and deployment metadata. |
| `GET /x402/demo` | Human-readable demo path. |
| `GET /x402/payment-requirements/:slug` | Payment requirement object without requesting the protected resource. |
| `POST /x402/verify` | Verify an on-chain order by `orderId`, optional `agentSlug`, and optional requester. |
| `GET /agent/:slug/work` | Protected x402 resource. Returns `402` until fulfilled/settled. |
| `POST /agent/:slug/provider/fulfill` | Provider-side fulfillment using a configured provider key and admin secret. |

## Payment Requirement Shape

The protected endpoint returns:

```json
{
  "x402Version": "1",
  "arcpayScheme": "arcpay-arbitrum-escrow-v1",
  "protocol": "x402",
  "caip2Network": "eip155:421614",
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:421614",
      "currency": "ETH",
      "maxAmountRequired": "100000000000000",
      "payTo": "0x...",
      "action": "createOrder(bytes32,string)",
      "paymentProof": {
        "type": "arbitrum-order-id",
        "header": "X-Payment"
      }
    }
  ]
}
```

This makes ArcPay useful for agent builders today: an agent can discover a
priced service, pay through Arbitrum escrow, and retry the HTTP resource with the
order ID as the payment proof.

## Funded Verification

```bash
npm run smoke:x402
```

The smoke test starts the server, registers a new agent, funds a requester, sets
treasury policy, proves the protected endpoint returns `402`, creates a real
Arbitrum escrow order, verifies paid-but-locked state, fulfills through the x402
server, unlocks the protected work, and settles the order.
