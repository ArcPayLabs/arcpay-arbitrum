import { NextResponse } from "next/server";
import { GMX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/gmx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(process.env.GMX_API_BASE_URL || process.env.GMX_ORACLE_URL || process.env.GMX_SUBSQUID_URL);

  return NextResponse.json({
    ok: true,
    configured,
    mode: configured ? "sdk-ready" : "official-contract-config",
    network: {
      name: GMX_ARBITRUM_SEPOLIA.network,
      chainId: GMX_ARBITRUM_SEPOLIA.chainId,
      explorer: GMX_ARBITRUM_SEPOLIA.explorer,
    },
    docs: {
      contracts: GMX_ARBITRUM_SEPOLIA.docs,
      sdk: GMX_ARBITRUM_SEPOLIA.sdkDocs,
      source: GMX_ARBITRUM_SEPOLIA.source,
    },
    sdk: {
      ...GMX_ARBITRUM_SEPOLIA.sdk,
      rpcUrlConfigured: Boolean(process.env.ARBITRUM_RPC_URL),
      oracleUrlConfigured: Boolean(process.env.GMX_ORACLE_URL),
      subsquidUrlConfigured: Boolean(process.env.GMX_SUBSQUID_URL),
      apiBaseUrlConfigured: Boolean(process.env.GMX_API_BASE_URL),
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
