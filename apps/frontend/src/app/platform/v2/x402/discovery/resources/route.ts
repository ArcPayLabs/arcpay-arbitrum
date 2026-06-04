import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    x402Version: "1",
    protocol: "x402",
    network: "arbitrum-sepolia",
    chainId: 421614,
    resources: [
      {
        name: "ArcPay Arbitrum treasury-router work",
        description: "Paid Arbitrum agent work protected by ArcPay x402, ETH escrow, policy, and audit evidence.",
        resourceUrl: "https://arcpay-arbitrum.vercel.app/api/agent/treasury-router/work",
        paymentRequirementsUrl: "https://arcpay-arbitrum.vercel.app/api/x402/payment-requirements/treasury-router",
        verificationUrl: "https://arcpay-arbitrum.vercel.app/api/x402/verify",
        method: "GET",
        asset: "ETH",
        amount: "0.01",
        payTo: "0x3587fd962d40433165d5f2a3dFc60636ebD11e59",
        settlement: "AgentOrderBook.createOrder(agentId, requestUri)",
        evidence: ["HTTP 402 response", "AgentOrderBook order id", "Arbitrum tx hash", "x402 verification response"],
      },
    ],
  });
}
