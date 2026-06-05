import { NextResponse } from "next/server";

const origin = "https://arcpay-arbitrum.vercel.app";

export function GET() {
  return NextResponse.json({
    service: "ArcPay Arbitrum Web Bot Auth",
    version: "0.1.0",
    directory: `${origin}/.well-known/http-message-signatures-directory`,
    keys: [],
    algorithms: ["ed25519", "ecdsa-p256-sha256"],
    protected_resources: [
      `${origin}/api/mcp`,
      `${origin}/api/developer/tools`,
      `${origin}/platform/v2/x402/discovery/resources`,
    ],
    contact: "mailto:jasonneil4040@gmail.com",
  });
}
