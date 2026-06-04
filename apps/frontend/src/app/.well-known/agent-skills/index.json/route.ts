import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const skills = [
  {
    name: "ArcPay Arbitrum x402 agent payments",
    type: "mcp-tool",
    description: "Plan and verify x402 paid Arbitrum agent work with escrow evidence.",
    url: "https://arcpay-arbitrum.vercel.app/api/mcp",
  },
  {
    name: "ArcPay Arbitrum ZeroDev and GMX handoff",
    type: "mcp-tool",
    description: "Prepare sponsored execution, GMX policy handoffs, and proof requirements.",
    url: "https://arcpay-arbitrum.vercel.app/api/mcp",
  },
  {
    name: "ArcPay Arbitrum starter kit",
    type: "npm-package",
    description: "Plug-and-play client for builders selling or consuming paid agent work through ArcPay x402.",
    url: "https://www.npmjs.com/package/@arcpaylabs/arbitrum-x402-agent-starter",
  },
].map((skill) => ({
  ...skill,
  sha256: createHash("sha256").update(`${skill.name}:${skill.url}`).digest("hex"),
}));

export function GET() {
  return NextResponse.json({
    $schema: "https://agentskills.io/schemas/agent-skills-index-v0.2.json",
    name: "ArcPay Arbitrum agent skills",
    description: "Discovery index for ArcPay Arbitrum agent treasury, x402, privacy, ZeroDev, GMX, Fhenix, and evidence tools.",
    skills,
  });
}
