import { NextResponse } from "next/server";
import { FHENIX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/fhenix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: true,
    mode: "live-cofhe-policy-proof",
    network: {
      name: FHENIX_ARBITRUM_SEPOLIA.network,
      chainId: FHENIX_ARBITRUM_SEPOLIA.chainId,
    },
    docs: {
      quickStart: FHENIX_ARBITRUM_SEPOLIA.docs,
      source: FHENIX_ARBITRUM_SEPOLIA.source,
    },
    packages: FHENIX_ARBITRUM_SEPOLIA.packages,
    taskManager: FHENIX_ARBITRUM_SEPOLIA.taskManager,
    liveProof: FHENIX_ARBITRUM_SEPOLIA.liveProof,
    guardrails: {
      commitmentOnlyPublicState: true,
      encryptedHandlesOnly: true,
      policyAndAuditRequired: true,
      noPlaintextTreasuryMetadataInAppProof: true,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
