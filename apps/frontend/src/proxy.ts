import { NextResponse, type NextRequest } from "next/server";

const MARKDOWN_HOME = `# ArcPay Arbitrum

ArcPay Arbitrum is a control plane and developer distribution layer for AI-agent treasury operations on Arbitrum Sepolia.

## Agent entrypoints

- App: https://arcpay-arbitrum.vercel.app
- Docs: https://arcpay-arbitrum.vercel.app/docs/overview
- OpenAPI: https://arcpay-arbitrum.vercel.app/openapi.json
- Hosted MCP bridge: https://arcpay-arbitrum.vercel.app/api/mcp
- Agent skills index: https://arcpay-arbitrum.vercel.app/.well-known/agent-skills/index.json
- x402 gateway: https://arcpay-arbitrum.vercel.app/api/agent/research-agent/work

## Capabilities

- Agent registry and bring-your-own-agent onboarding
- x402 protected paid agent work
- ETH escrow and order verification
- USDC spend cards
- Privacy intents and audit release records
- ZeroDev sponsorship, GMX policy handoff, Fhenix privacy proofs, CLI, MCP, and starter kits
`;

export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (request.nextUrl.pathname === "/" && accept.includes("text/markdown")) {
    return new NextResponse(MARKDOWN_HOME, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(MARKDOWN_HOME.split(/\s+/).length),
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
