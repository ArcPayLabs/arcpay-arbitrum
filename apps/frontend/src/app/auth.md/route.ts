import { NextResponse } from "next/server";

const body = `# Auth.md - ArcPay Arbitrum auth

ArcPay supports wallet-first operator access and hosted MCP developer keys.

## Human operators

1. Open https://arcpay-arbitrum.vercel.app/sign-in
2. Connect an EVM wallet on Arbitrum Sepolia or use an existing email workspace.
3. Create or resume a workspace before opening the dashboard.

## Agent and MCP clients

1. Open Developer Access inside the dashboard.
2. Create a scoped MCP key.
3. Call https://arcpay-arbitrum.vercel.app/api/mcp with Authorization: Bearer <key>.

Public read-only discovery endpoints include /openapi.json, /llms.txt, /.well-known/api-catalog, /.well-known/mcp/server-card.json, and /.well-known/agent-skills/index.json.
`;

export function GET() {
  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
