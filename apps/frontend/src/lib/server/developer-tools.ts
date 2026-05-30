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
        "Server: https://arbitrum-x402.20.208.46.195.nip.io",
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
          x402Gateway: "https://arbitrum-x402.20.208.46.195.nip.io",
          protectedResource: `https://arbitrum-x402.20.208.46.195.nip.io/agent/${encodeURIComponent(agentSlug)}/work`,
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
