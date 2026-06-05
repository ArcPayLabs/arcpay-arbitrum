import { NextResponse } from "next/server";

const body = `# Auth.md - ArcPay Arbitrum auth

ArcPay supports wallet-first operator access and hosted MCP developer keys.

## Human operators

1. Open https://arcpay-arbitrum.vercel.app/sign-in
2. Connect an EVM wallet on Arbitrum Sepolia or use an existing email workspace.
3. Create or resume a workspace before opening the dashboard.

## Agent and MCP clients

Agent registration is supported through ArcPay workspace onboarding, scoped MCP developer keys, and claim-code based agent onboarding.

### Agent registration

1. Register URI: https://arcpay-arbitrum.vercel.app/developer-access
2. Claim URI: https://arcpay-arbitrum.vercel.app/onboard
3. Revocation URI: https://arcpay-arbitrum.vercel.app/developer-access
4. Supported identity types: wallet, email workspace, MCP bearer key, claim code.
5. Supported credential types: EVM wallet signature, scoped MCP bearer token, ArcPay agent claim code.
6. Open Developer Access inside the dashboard.
7. Create a scoped MCP key.
8. Call https://arcpay-arbitrum.vercel.app/api/mcp with Authorization: Bearer <key>.

Public read-only discovery endpoints include /openapi.json, /llms.txt, /.well-known/api-catalog, /.well-known/mcp/server-card.json, and /.well-known/agent-skills/index.json.
`;

export function GET() {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
