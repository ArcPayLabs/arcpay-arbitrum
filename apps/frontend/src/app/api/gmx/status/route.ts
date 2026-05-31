import { NextResponse } from "next/server";
import { GMX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/gmx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apiBaseUrl = process.env.GMX_API_BASE_URL || GMX_ARBITRUM_SEPOLIA.apiBaseUrl;

  return NextResponse.json({
    ok: true,
    configured: true,
    mode: "live-classic-sdk-proof",
    network: {
      name: GMX_ARBITRUM_SEPOLIA.network,
      chainId: GMX_ARBITRUM_SEPOLIA.chainId,
      explorer: GMX_ARBITRUM_SEPOLIA.explorer,
    },
    liveProof: GMX_ARBITRUM_SEPOLIA.liveProof,
    docs: {
      contracts: GMX_ARBITRUM_SEPOLIA.docs,
      sdk: GMX_ARBITRUM_SEPOLIA.sdkDocs,
      source: GMX_ARBITRUM_SEPOLIA.source,
    },
    sdk: {
      ...GMX_ARBITRUM_SEPOLIA.sdk,
      apiBaseUrl,
      rpcUrlConfigured: Boolean(process.env.ARBITRUM_RPC_URL),
      apiBaseUrlConfigured: true,
      oracleUrlConfigured: false,
      subsquidUrlConfigured: false,
      executionMode: "classic wallet transaction",
    },
    contracts: GMX_ARBITRUM_SEPOLIA.contracts,
    markets: GMX_ARBITRUM_SEPOLIA.markets,
    guardrails: {
      requireArcPayPolicy: true,
      requireOperatorApprovalForLeverage: true,
      requireArbiscanTxHashForCompletion: true,
      requireDuneOrWorkerEvidence: true,
      defaultMaxSlippageBps: 50,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
