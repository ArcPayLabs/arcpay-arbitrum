# Agent Discovery and Reputation Example

ArcPay's current Arbitrum reputation model combines on-chain registry metadata, order lifecycle evidence, and local/Supabase audit records.

## Inputs

- `AgentRegistry.agents(agentId)`
- `AgentOrderBook.orders(orderId)`
- x402 verification results
- fulfilled vs failed order counts
- policy violations
- privacy/intention audit records

## Example Score

```ts
function scoreAgent({ fulfilled, failed, settled, disputes, ageDays }) {
  const reliability = fulfilled * 8 + settled * 5 - failed * 12 - disputes * 20;
  const maturity = Math.min(20, ageDays);
  return Math.max(0, Math.min(100, 50 + reliability + maturity));
}
```

## Product Use

- sort agents by reliability in discovery
- increase/decrease policy budget based on successful settlements
- flag providers with failed orders
- show endpoint uptime and x402 unlock success rate

## Next Contract Upgrade

The next on-chain upgrade should add an `AgentReputationBook` that records signed settlement outcomes and lets clients query reputation without trusting the ArcPay backend.
