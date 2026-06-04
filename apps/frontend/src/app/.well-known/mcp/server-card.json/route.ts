import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    schema_version: "0.1",
    serverInfo: {
      name: "ArcPay Arbitrum MCP",
      version: "0.1.2",
      description: "Hosted ArcPay tools for Arbitrum agent treasury, x402, privacy, invoices, ZeroDev, GMX, Fhenix, and evidence planning.",
    },
    transport: {
      type: "http",
      endpoint: "https://arcpay-arbitrum.vercel.app/api/mcp",
      auth: "bearer-or-public-rate-limited",
    },
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    packages: {
      npm: "@arcpaylabs/arbitrum-mcp",
      cli: "@arcpaylabs/arbitrum-cli",
      starter: "@arcpaylabs/arbitrum-x402-agent-starter",
    },
  });
}
