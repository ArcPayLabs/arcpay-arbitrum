import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    protocol: "agentic-commerce-protocol",
    name: "ArcPay Arbitrum",
    version: "0.1.0",
    website: origin,
    network: {
      chain: "arbitrum-sepolia",
      currency: "ETH",
    },
    capabilities: [
      "x402-paid-agent-work",
      "mcp-tools",
      "agent-onboarding",
      "policy-gated-spend",
      "privacy-intents",
      "zerodev-userops",
      "gmx-risk-adapters",
      "fhenix-privacy-adapters",
      "dune-analytics",
      "audit-evidence",
    ],
    discovery: {
      openapi: `${origin}/openapi.json`,
      llms: `${origin}/llms.txt`,
      apiCatalog: `${origin}/.well-known/api-catalog`,
      mcp: `${origin}/.well-known/mcp/server-card.json`,
      x402: `${origin}/platform/v2/x402/discovery/resources`,
    },
  });
}
