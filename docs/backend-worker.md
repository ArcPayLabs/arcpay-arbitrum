# ArcPay Arbitrum Worker

`apps/worker` is the Azure-ready event reconciler for Arbitrum.

It backfills and polls:

- `AgentRegistry` registration and update events
- `TreasuryPolicy` policy, allowlist, approval, and spend events
- `AgentTreasury` escrow deposit, settlement, and refund events
- `AgentOrderBook` order lifecycle events
- `AgentSpendCardVault` USDC card events
- `OperatorControls` claim-code and webhook-circuit events
- `ArbitrumPrivacyVault` ETH/USDC privacy intent events
- `AgentInvoiceBook` ETH/USDC invoice creation, payment, and cancellation events
- `ArbitrumAgentRiskOracle` risk request and fulfillment events

## Run Locally

```bash
npm run install:worker
npm run worker
```

One-shot verification:

```bash
npm run worker:once
```

## Azure App Service / VM

Set:

```bash
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARCPAY_ROOT=/path/to/arcpay-arbitrum
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
ARCPAY_RECORDS_TABLE=arcpay_arbitrum_records
ARCPAY_WORKER_CHECKPOINT_PATH=/home/arcpay/.arcpay-arbitrum-worker-checkpoint.json
```

Start command:

```bash
npm run worker
```

The worker writes structured records into Supabase when `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set. Without Supabase it prints the same records
as structured JSON logs.

Each indexed event is idempotent by chain, contract, transaction hash, and log
index. The checkpoint file lets the worker resume from the last scanned Arbitrum
block after a restart.

Current VM deployment uses a systemd service:

```bash
sudo systemctl status arcpay-arbitrum-worker --no-pager
sudo journalctl -u arcpay-arbitrum-worker -n 50 --no-pager
sudo systemctl restart arcpay-arbitrum-worker
```

The service runs from `/home/arcpay/arcpay-arbitrum` and restarts automatically
after VM reboot.

Dashboard and Audit pages fetch `/api/records`, so worker-reconciled events
appear in the product UI alongside browser-created records.
