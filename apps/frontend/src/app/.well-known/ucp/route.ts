import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    ucp: {
      version: "0.1.0",
      profile: "agent-commerce",
    },
    protocol: "universal-commerce-protocol",
    name: "ArcPay Arbitrum",
    website: origin,
    services: [
      {
        id: "arbitrum-x402-agent-work",
        name: "Arbitrum x402 agent work",
        capabilities: ["paid_agent_resource", "policy_escrow", "audit_evidence"],
        endpoint: `${origin}/api/x402/resource/research-agent`,
      },
    ],
    capabilities: ["x402", "mcp", "agent_onboarding", "wallet_auth", "privacy_intents"],
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
