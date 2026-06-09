# Live Wallet And Agent QA Plan

Use this for the final recording session where Henry approves wallet prompts.

## Goals

1. Prove the Arbitrum app works with a real wallet session.
2. Prove ArcPay can onboard an external agent through CLI/MCP/starter-kit surfaces.
3. Prove policies, x402, ZeroDev, GMX, Fhenix, Dune, cards, privacy, and audit evidence are connected.
4. Capture evidence without claiming execution before transaction/order proof exists.

## Wallet QA Flow

Use the funded Arbitrum Sepolia wallet in the browser.

1. Open https://arcpay-arbitrum.vercel.app.
2. Click **Open App** or **Sign in**.
3. Connect wallet and approve:
   - network add/switch to Arbitrum Sepolia
   - account connection
   - wallet auth signature
4. Confirm dashboard loads with the wallet address in the top bar.
5. Open `/wallet` and confirm wallet/session state.
6. Open `/app/agents`, load/register `treasury-router` or `research-agent`.
7. Open `/policies`, set conservative limits and allowlist the agent.
8. Open `/execution`, check ZeroDev sponsor policy, GMX/Fhenix/Dune status, and capture:
   - sponsor policy response
   - UserOp or webhook proof if available
   - GMX/Fhenix/Dune evidence response
9. Open `/x402`, quote the protected resource, create an order only if budget is acceptable, and capture:
   - x402 quote JSON
   - order transaction hash
   - order ID
   - verification response
10. Open `/privacy`, create a privacy intent only if amount and recipient are safe, and capture commitment/memo evidence.
11. Open `/cards`, delegate a USDC card only if token balance/approval is ready.
12. Open `/audit` and confirm wallet/action evidence appears.
13. Open `/status` and confirm live network/API status.

## External Agent Onboarding Flow

### CLI Agent

```powershell
npm install -g @arcpaylabs/arbitrum-cli
arcpay-arbitrum wallet
arcpay-arbitrum x402-guide
arcpay-arbitrum zerodev-policy
arcpay-arbitrum gmx-plan
```

Use the CLI output to configure the agent with:

- ArcPay app: `https://arcpay-arbitrum.vercel.app`
- x402 gateway: `https://arcpay-arbitrum.vercel.app/api/x402`
- Agent skills index: `https://arcpay-arbitrum.vercel.app/.well-known/agent-skills/index.json`
- ZeroDev sponsor policy: `https://arcpay-arbitrum.vercel.app/api/zerodev/sponsor-policy`

### MCP Agent

```powershell
npm install -g @arcpaylabs/arbitrum-mcp
```

Claude Desktop/Codex-style MCP config:

```json
{
  "mcpServers": {
    "arcpay-arbitrum": {
      "command": "arcpay-arbitrum-mcp"
    }
  }
}
```

Ask the connected agent:

```text
Use ArcPay Arbitrum as my treasury policy, x402, ZeroDev, GMX, Fhenix, Dune, and audit evidence layer.
Call get_deployment, x402_guide, zerodev_policy, gmx_plan, and evidence_template.
Prepare a safe plan for an agent called treasury-router.
Do not claim execution without an Arbitrum tx hash, x402 verification, UserOp hash, GMX/Fhenix/Dune proof, or ArcPay audit record.
```

### Starter Kit Agent

```powershell
npm install -g @arcpaylabs/arbitrum-x402-agent-starter
arcpay-arbitrum-x402-agent quote treasury-router
```

Expected proof:

- Agent client reads x402 payment requirements.
- Returned quote includes payment amount, protected resource URL, and verification URL.
- Actual order creation still requires wallet signing or an approved agent/smart-account signer.

## Recording Rule

Do not say "executed" unless the recording shows at least one of:

- Arbitrum Sepolia transaction hash
- x402 verification response
- ArcPay order ID with fulfilled/settled state
- ZeroDev UserOperation hash or sponsorship proof
- GMX/Fhenix/Dune evidence response
- ArcPay audit record with source evidence
