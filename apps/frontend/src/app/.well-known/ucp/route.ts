import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    protocol: "universal-commerce-protocol",
    name: "ArcPay Arbitrum",
    website: origin,
    payments: {
      x402: `${origin}/platform/v2/x402/discovery/resources`,
      protectedResource: `${origin}/api/x402/resource/research-agent`,
    },
    agentAccess: {
      auth: `${origin}/auth.md`,
      mcp: `${origin}/api/mcp`,
      skills: `${origin}/.well-known/agent-skills/index.json`,
    },
  });
}
