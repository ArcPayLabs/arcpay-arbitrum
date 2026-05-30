import { id, keccak256, toUtf8Bytes } from "ethers";
import deployment from "../../../../../deployments/arbitrum-sepolia.json";

type ToolResult = {
  contentType: "application/json" | "text/plain";
  body: unknown;
};

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const network = {
  name: "Arbitrum Sepolia",
  chainId: 421614,
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  explorerUrl: "https://sepolia.arbiscan.io",
  currency: "ETH",
};

export const developerTools: ToolDefinition[] = [
  {
    name: "get_deployment",
    description: "Return ArcPay Arbitrum deployment metadata and contract addresses.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "derive_agent_id",
    description: "Derive the bytes32 agent id used by AgentRegistry.",
    inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } },
  },
  {
    name: "derive_invoice_id",
    description: "Derive the bytes32 invoice id used by AgentInvoiceBook.",
    inputSchema: { type: "object", required: ["publicId"], properties: { publicId: { type: "string" } } },
  },
  {
    name: "derive_claim_hash",
    description: "Derive the claim-code hash used by OperatorControls.",
    inputSchema: { type: "object", required: ["code"], properties: { code: { type: "string" } } },
  },
  {
    name: "derive_privacy_commitment",
    description: "Derive a Privacy Intent commitment or nullifier from secret text.",
    inputSchema: { type: "object", required: ["secret"], properties: { secret: { type: "string" } } },
  },
  {
    name: "privacy_intent_guide",
    description: "Return integration steps for ArcPay Privacy Intents.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "invoice_guide",
    description: "Return integration steps for ETH and USDC invoices.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "x402_guide",
    description: "Return integration steps for x402 paid agent endpoints.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "execution_handoff",
    description: "Return an Arbitrum execution handoff payload for GMX, Stylus policy checks, ZeroDev smart accounts, Dune evidence, or manual execution.",
    inputSchema: {
      type: "object",
      properties: {
        strategyName: { type: "string" },
        agentSlug: { type: "string" },
        budgetEth: { type: "string" },
        adapter: { type: "string" },
      },
    },
  },
  {
    name: "gmx_execution_plan",
    description: "Create a policy-bounded GMX execution plan for an Arbitrum agent before any trade or hedge is signed.",
    inputSchema: {
      type: "object",
      properties: {
        market: { type: "string" },
        collateral: { type: "string" },
        sizeUsd: { type: "string" },
        maxLeverage: { type: "string" },
      },
    },
  },
  {
    name: "zerodev_session_policy",
    description: "Return a ZeroDev smart-account session policy for bounded ArcPay agent actions.",
    inputSchema: {
      type: "object",
      properties: {
        agentSlug: { type: "string" },
        budgetEth: { type: "string" },
        expiresInMinutes: { type: "number" },
      },
    },
  },
  {
    name: "dune_evidence_spec",
    description: "Return the Dune dashboard/query schema ArcPay expects for public Arbitrum proof analytics.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "fhenix_privacy_boundary",
    description: "Return the Fhenix confidential-compute boundary for ArcPay private treasury metadata.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "starter_kit",
    description: "Return the recommended starter-kit files for a Arbitrum x402 agent.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "roadmap",
    description: "Return the ArcPay Arbitrum product roadmap.",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function runDeveloperTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
  switch (name) {
    case "get_deployment":
      return json({ network, deployment });
    case "derive_agent_id":
      return text(id(requiredString(args.slug, "slug")));
    case "derive_invoice_id":
      return text(keccak256(toUtf8Bytes(requiredString(args.publicId, "publicId"))));
    case "derive_claim_hash":
      return text(keccak256(toUtf8Bytes(requiredString(args.code, "code"))));
    case "derive_privacy_commitment":
      return text(keccak256(toUtf8Bytes(requiredString(args.secret, "secret"))));
    case "privacy_intent_guide":
      return text([
        "ArcPay Privacy Intents",
        `Vault: ${deployment.contracts.ArbitrumPrivacyVault}`,
        `USDC: ${deployment.usdcToken}`,
        "1. commitment = keccak256(secret).",
        "2. For ETH, call createNativeIntent(commitment, encryptedMemoUri) with msg.value.",
        "3. For USDC, approve the vault and call createTokenIntent(commitment, USDC, amount, encryptedMemoUri).",
        "4. Release with releaseIntent(commitment, nullifier, recipient).",
        "5. Cancellation refunds unreleased intents to the operator.",
        "Boundary: this hides metadata and recipient until release; it is not a full shielded pool.",
      ].join("\n"));
    case "invoice_guide":
      return text([
        "ArcPay Arbitrum Invoices",
        `InvoiceBook: ${deployment.contracts.AgentInvoiceBook}`,
        `USDC: ${deployment.usdcToken}`,
        "1. invoiceId = keccak256(publicInvoiceId).",
        "2. Create ETH invoices with token address(0) and amountWei.",
        "3. Create USDC invoices with the USDC token address and base-unit amount.",
        "4. Pay ETH with payNativeInvoice(invoiceId) and exact msg.value.",
        "5. Pay USDC by approving InvoiceBook, then calling payTokenInvoice(invoiceId).",
      ].join("\n"));
    case "x402_guide":
      return text([
        "ArcPay Arbitrum x402",
        "Server: https://arcpay-arbitrum.vercel.app/api",
        `Registry: ${deployment.contracts.AgentRegistry}`,
        `OrderBook: ${deployment.contracts.AgentOrderBook}`,
        "1. Register an agent slug in AgentRegistry.",
        "2. GET /agent/:slug/work returns HTTP 402 with exact ETH payment requirements.",
        "3. Payer calls AgentOrderBook.createOrder(agentId, requestUri) with quoted msg.value.",
        "4. Provider fulfills the order.",
        "5. GET /agent/:slug/work?orderId=... unlocks after Fulfilled or Settled.",
      ].join("\n"));
    case "execution_handoff": {
      const strategyName = String(args.strategyName ?? "arcpay-treasury-cfo");
      const agentSlug = String(args.agentSlug ?? "treasury-router");
      const budgetEth = String(args.budgetEth ?? "0.02");
      const adapter = String(args.adapter ?? "GMX execution intent");
      return json({
        protocol: "arcpay-arbitrum-execution-handoff",
        chain: "arbitrum-sepolia",
        chainId: 421614,
        adapter,
        executionAddress: "set-after-wallet-or-smart-account-connection",
        strategyName,
        agentSlug,
        objective: "Execute only policy-approved Arbitrum treasury work through ArcPay x402, escrow, privacy, invoice, reputation, and audit modules.",
        constraints: {
          maxBudgetEth: budgetEth,
          allowedAssets: ["ETH", "USDC", "WETH"],
          allowedVenues: ["GMX", "Stylus policy module", "ZeroDev smart account", "Dune evidence", "Manual signer"],
          requireArcPayPolicy: true,
          requireOperatorApprovalForLeverage: true,
          requireExecutionEvidence: true,
          requireArbiscanTxHashForCompletion: true,
          noCompletionWithoutTxHashOrOrderEvidence: true,
        },
        endpoints: {
          x402Gateway: "https://arcpay-arbitrum.vercel.app/api",
          protectedResource: `https://arcpay-arbitrum.vercel.app/api/agent/${encodeURIComponent(agentSlug)}/work`,
          status: "https://arcpay-arbitrum.vercel.app/api/status",
          openapi: "https://arcpay-arbitrum.vercel.app/openapi.json",
        },
        contracts: {
          registry: deployment.contracts.AgentRegistry,
          orderBook: deployment.contracts.AgentOrderBook,
          policy: deployment.contracts.TreasuryPolicy,
          privacyVault: deployment.contracts.ArbitrumPrivacyVault,
          reputation: deployment.contracts.AgentReputationBook,
        },
        setup: [
          "Register or select an ArcPay agent identity.",
          "Choose an execution adapter: GMX intent, Stylus policy check, ZeroDev smart account, Dune evidence, or manual signer.",
          "Create the x402 quote or escrow order before work starts.",
          "Execute only after policy approval and budget checks.",
          "Attach Arbiscan tx hash, x402 verification, Dune query link, or signed result evidence before marking the work complete.",
        ],
      });
    }
    case "gmx_execution_plan": {
      const market = String(args.market ?? "ETH/USD");
      const collateral = String(args.collateral ?? "USDC");
      const sizeUsd = String(args.sizeUsd ?? "25");
      const maxLeverage = String(args.maxLeverage ?? "1.2x");
      return json({
        protocol: "arcpay-gmx-execution-plan",
        chain: "arbitrum-sepolia",
        venue: "GMX",
        market,
        collateral,
        sizeUsd,
        maxLeverage,
        controls: {
          requireArcPayPolicy: true,
          requireExecutionRouterIntent: true,
          requireOperatorApprovalForLeverage: true,
          requireArbiscanTxHash: true,
          requireDuneEvidenceLink: true,
        },
        contracts: {
          executionRouter: deployment.contracts.ArbitrumExecutionRouter,
          policy: deployment.contracts.TreasuryPolicy,
          orderBook: deployment.contracts.AgentOrderBook,
        },
        artifactsToCollect: [
          "GMX route/position quote",
          "ArcPay execution intent id",
          "policy approval evidence URI",
          "Arbiscan transaction hash after execution",
          "Dune dashboard or query link for post-trade proof",
        ],
      });
    }
    case "zerodev_session_policy": {
      const agentSlug = String(args.agentSlug ?? "treasury-router");
      const budgetEth = String(args.budgetEth ?? "0.02");
      const expiresInMinutes = Number(args.expiresInMinutes ?? 60);
      return json({
        protocol: "arcpay-zerodev-session-policy",
        chain: "arbitrum-sepolia",
        agentSlug,
        accountAbstraction: "ZeroDev",
        sessionScope: {
          allowedContracts: [
            deployment.contracts.AgentOrderBook,
            deployment.contracts.TreasuryPolicy,
            deployment.contracts.ArbitrumExecutionRouter,
            deployment.contracts.ArbitrumPrivacyVault,
          ],
          maxBudgetEth: budgetEth,
          expiresInMinutes,
          blockedActions: ["unbounded leverage", "unknown target contract", "execution without evidence URI"],
        },
        requiredEvidence: ["session key address", "policy hash", "execution intent id", "final tx hash"],
      });
    }
    case "dune_evidence_spec":
      return json({
        protocol: "arcpay-dune-evidence",
        chain: "arbitrum-sepolia",
        tables: [
          "AgentRegistered events by agentId and owner",
          "OrderCreated / OrderStatusChanged / OrderFulfilled lifecycle",
          "ExecutionIntentProposed / Approved / Executed lifecycle",
          "SpendRecorded policy events",
          "Privacy intent create/release/cancel events",
          "ReputationRecorded events",
        ],
        dashboardCards: [
          "active agents",
          "x402 order volume",
          "execution intents by adapter",
          "policy rejections and approval thresholds",
          "privacy intent release/cancel ratio",
          "agent reputation score distribution",
        ],
        requiredPublicProof: ["Dune query URL", "Arbiscan contract links", "live app status URL"],
      });
    case "fhenix_privacy_boundary":
      return json({
        protocol: "arcpay-fhenix-privacy-boundary",
        chain: "arbitrum",
        purpose: "Use Fhenix-style confidential compute for private treasury metadata while ArcPay keeps settlement and audit commitments on Arbitrum.",
        privateInputs: ["counterparty notes", "agent prompt fragments", "risk memo", "invoice memo", "treasury strategy rationale"],
        publicOutputs: ["commitment", "nullifier", "evidence URI", "execution intent id", "Arbiscan tx hash"],
        boundary: "ArcPay PrivacyVault is live commitment/nullifier infrastructure; Fhenix is the confidential-compute adapter path for encrypted policy/risk computation.",
      });
    case "starter_kit":
      return json({
        files: [
          "starter-kits/arbitrum-x402-agent/README.md",
          "starter-kits/arbitrum-x402-agent/package.json",
          "starter-kits/arbitrum-x402-agent/src/agent-client.mjs",
          "starter-kits/arbitrum-x402-agent/src/env.example",
        ],
        commands: [
          "npm install",
          "cp src/env.example .env",
          "node src/agent-client.mjs quote research-agent",
        ],
      });
    case "roadmap":
      return json({
        phases: [
          "Deploy Mintlify and keep /openapi.json + /llms.txt public.",
          "Publish Arbitrum x402 starter kit and privacy-intent examples.",
          "Operate the hosted MCP-style JSON-RPC bridge with auth and rate limits.",
          "Expand agent discovery with reputation and service analytics.",
          "Package the Arbitrum x402 gateway, privacy intents, and policy controls as reusable builder infrastructure.",
        ],
      });
    default:
      throw new Error(`Unknown developer tool: ${name}`);
  }
}

function requiredString(value: unknown, key: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${key} is required`);
  return text;
}

function json(body: unknown): ToolResult {
  return { contentType: "application/json", body };
}

function text(body: string): ToolResult {
  return { contentType: "text/plain", body };
}
