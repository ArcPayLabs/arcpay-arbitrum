# ArcPay Arbitrum Demo Video Plan

Target: 4:30-4:55.

## Assets

- App: https://arcpay-arbitrum.vercel.app
- Docs: https://arcpay-arbitrum.vercel.app/docs/overview
- QA screenshots: `C:\Users\RICHEY_SON\Desktop\arcpay-arbitrum\qa-full-ui`
- QA report: `QA_REPORT.md`

## Shot List

| Time | Shot | Action |
| --- | --- | --- |
| 0:00-0:20 | Landing page | Show ArcPay as an Arbitrum agent treasury and x402 control plane. |
| 0:20-0:45 | Problem | Explain that agent payments need smart-contract quality, policy checks, gas sponsorship, paid API access, and verifiable evidence. |
| 0:45-1:15 | Auth and dashboard | Show wallet-first access, workspace, Arbitrum Sepolia context, status, and treasury overview. |
| 1:15-1:55 | Agents and x402 | Show agent registry, protected x402 resources, payment requirements, verification, and unlock flow. |
| 1:55-2:35 | ZeroDev execution | Show embedded ZeroDev policy UX, sponsorship checks, webhook proof, and UserOp evidence boundaries. |
| 2:35-3:10 | GMX/Fhenix/Dune | Show policy-gated GMX execution planning, Fhenix privacy/risk surface, and Dune analytics evidence. |
| 3:10-3:45 | Policies, cards, privacy | Show spend cards, limits, approvals, privacy intents, and audit rules. |
| 3:45-4:20 | Developer surfaces | Show docs, API catalog, MCP card, agent skills, CLI/MCP/npm packages, x402 starter kit, and OpenAPI. |
| 4:20-4:50 | Proof close | Show status page, QA report, contract addresses, and what evidence is required before claiming execution. |

## Wallet Approval Inserts

Use only when recording live:

1. Connect wallet and switch to Arbitrum Sepolia.
2. Wallet auth signature.
3. Agent registration transaction if captured live.
4. x402/order transaction if captured live.
5. ZeroDev sponsored action if captured live.
6. GMX/Fhenix/privacy transaction if captured live.

If a transaction takes too long, pause recording and resume on the confirmed tx/hash/evidence page.

## Recording Rule

Do not say "executed" unless the recording shows at least one of:

- Arbitrum Sepolia transaction hash
- x402 verification response
- ArcPay order ID with fulfilled/settled state
- ZeroDev UserOperation hash or sponsorship proof
- GMX/Fhenix/Dune evidence response
- ArcPay audit record with source evidence
