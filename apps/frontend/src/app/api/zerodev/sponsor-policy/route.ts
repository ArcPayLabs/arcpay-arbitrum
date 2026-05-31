import { NextResponse } from "next/server";
import { evaluateZeroDevPolicy } from "@arbitrum/lib/server/zerodev-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const decision = await evaluateZeroDevPolicy({
    chainId: Number(process.env.ARBITRUM_CHAIN_ID || 421614),
    calls: [],
  });
  return NextResponse.json({
    ok: true,
    live: Boolean(process.env.ZERODEV_WEBHOOK_LIVE === "true"),
    policy: {
      chainId: decision.chainId,
      maxNativeValueWei: decision.maxNativeValueWei,
      maxTokenAmount: decision.maxTokenAmount,
      allowedContracts: decision.allowedContracts,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const token = process.env.ZERODEV_WEBHOOK_SECRET || "";
  const auth = request.headers.get("authorization") || "";
  const urlToken = new URL(request.url).searchParams.get("token") || "";
  const headerToken = request.headers.get("x-zerodev-webhook-secret") || "";
  const tokenOk = !token || auth === `Bearer ${token}` || headerToken === token || urlToken === token;
  if (!tokenOk) {
    return NextResponse.json(policyResponse(false, "invalid webhook authorization"), { status: 200 });
  }

  const body = await request.json().catch(() => ({}));
  const decision = await evaluateZeroDevPolicy(body);
  return NextResponse.json({
    ...decision,
    ...policyResponse(decision.approved, decision.reason),
  }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function policyResponse(approved: boolean, reason: string) {
  return {
    sponsor: approved,
    approved,
    allowed: approved,
    success: approved,
    reason,
  };
}
