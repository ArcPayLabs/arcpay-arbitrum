import { NextResponse } from "next/server";
import deployment from "@arbitrum/deployment/arbitrum-sepolia.json";
import { GMX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/gmx";
import { FHENIX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/fhenix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    network: {
      name: deployment.network,
      chainId: deployment.chainId,
    },
    integrations: {
      zerodev: {
        configured: Boolean(process.env.ZERO_DEV_PROJECT_ID && process.env.ZERODEV_RPC_URL),
        apiKeyConfigured: Boolean(process.env.ZERODEV_API_KEY),
        projectId: mask(process.env.ZERO_DEV_PROJECT_ID),
        rpcUrl: maskUrl(process.env.ZERODEV_RPC_URL),
        sponsorPolicy: "/api/zerodev/sponsor-policy",
        maxNativeValueEth: process.env.ZERODEV_MAX_NATIVE_VALUE_ETH || "0.0005",
        maxTokenAmount: process.env.ZERODEV_MAX_TOKEN_AMOUNT || "1",
        walletAllowlistEnabled: Boolean(process.env.ZERODEV_ALLOWED_WALLETS),
      },
      dune: {
        configured: Boolean(process.env.DUNE_API_KEY),
        mcpUrlConfigured: Boolean(process.env.DUNE_MCP_URL),
        mcpServer: "dune_prod",
        evidenceQueryId: process.env.DUNE_EVIDENCE_QUERY_ID || "7623300",
        evidenceUrl: `https://dune.com/queries/${process.env.DUNE_EVIDENCE_QUERY_ID || "7623300"}`,
        purpose: "Arbitrum event analytics and public execution evidence.",
      },
      gmx: {
        configured: true,
        mode: "live-classic-sdk-proof",
        status: "/api/gmx/status",
        chainId: GMX_ARBITRUM_SEPOLIA.chainId,
        exchangeRouter: GMX_ARBITRUM_SEPOLIA.contracts.ExchangeRouter,
        dataStore: GMX_ARBITRUM_SEPOLIA.contracts.DataStore,
        reader: GMX_ARBITRUM_SEPOLIA.contracts.Reader,
        eventEmitter: GMX_ARBITRUM_SEPOLIA.contracts.EventEmitter,
        liveProof: GMX_ARBITRUM_SEPOLIA.liveProof,
        purpose: "Policy-bounded GMX Arbitrum Sepolia swap/hedge execution with post-trade evidence.",
      },
      fhenix: {
        configured: true,
        mode: "live-cofhe-policy-proof",
        status: "/api/fhenix/status",
        taskManager: FHENIX_ARBITRUM_SEPOLIA.taskManager,
        liveProof: FHENIX_ARBITRUM_SEPOLIA.liveProof,
        purpose: "CoFHE confidential policy handles for private treasury metadata; ArcPay anchors commitments on Arbitrum.",
      },
    },
    contracts: {
      executionRouter: deployment.contracts.ArbitrumExecutionRouter,
      policy: deployment.contracts.TreasuryPolicy,
      orderBook: deployment.contracts.AgentOrderBook,
      privacyVault: deployment.contracts.ArbitrumPrivacyVault,
      usdc: deployment.usdcToken,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}

function mask(value?: string) {
  if (!value) return null;
  return value.length <= 10 ? "***" : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function maskUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.split("/").slice(0, 5).join("/")}/...`;
  } catch {
    return mask(value);
  }
}
