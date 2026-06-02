#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { id, keccak256, toUtf8Bytes } from "ethers";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const deploymentPath = path.join(root, "deployments", "arbitrum-sepolia.json");
const packagedDeploymentPath = path.join(__dirname, "deployment.json");

function readDeployment() {
  const file = fs.existsSync(deploymentPath) ? deploymentPath : packagedDeploymentPath;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const server = new McpServer({
  name: "arcpay-arbitrum",
  version: "0.1.0",
});

server.tool("get_deployment", "Return Arbitrum Sepolia contract addresses and network metadata.", {}, async () => ({
  content: [{ type: "text", text: JSON.stringify(readDeployment(), null, 2) }],
}));

server.tool("derive_agent_id", "Derive the bytes32 agent id used by AgentRegistry.", {
  slug: z.string().min(1),
}, async ({ slug }) => ({
  content: [{ type: "text", text: id(slug) }],
}));

server.tool("derive_invoice_id", "Derive the bytes32 invoice id used by AgentInvoiceBook.", {
  publicId: z.string().min(1),
}, async ({ publicId }) => ({
  content: [{ type: "text", text: keccak256(toUtf8Bytes(publicId)) }],
}));

server.tool("derive_claim_hash", "Derive the on-chain claim-code hash for OperatorControls.", {
  code: z.string().min(1),
}, async ({ code }) => ({
  content: [{ type: "text", text: keccak256(toUtf8Bytes(code)) }],
}));

server.tool("derive_privacy_commitment", "Derive a Privacy Intent commitment or nullifier from secret text.", {
  secret: z.string().min(1),
}, async ({ secret }) => ({
  content: [{ type: "text", text: keccak256(toUtf8Bytes(secret)) }],
}));

server.tool("privacy_intent_guide", "Return builder instructions for integrating ArcPay Privacy Intents on Arbitrum.", {}, async () => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: [
        "ArcPay Privacy Intents for Arbitrum",
        `Vault: ${deployment.contracts.ArbitrumPrivacyVault}`,
        `USDC: ${deployment.usdcToken}`,
        "commitment = keccak256(secret)",
        "nullifier = keccak256(releaseSecret)",
        "USDC flow: approve vault, then createTokenIntent(commitment, USDC, amount, encryptedMemoUri).",
        "ETH flow: createNativeIntent(commitment, encryptedMemoUri) with msg.value.",
        "Release: releaseIntent(commitment, nullifier, recipient).",
        "Boundary: this hides metadata/recipient during intent phase, not a full shielded pool.",
      ].join("\n"),
    }],
  };
});

server.tool("invoice_guide", "Return builder instructions for ArcPay ETH/USDC invoices on Arbitrum.", {}, async () => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: [
        "ArcPay Arbitrum Invoices",
        `InvoiceBook: ${deployment.contracts.AgentInvoiceBook}`,
        `USDC: ${deployment.usdcToken}`,
        "invoiceId = keccak256(publicInvoiceId)",
        "Create ETH invoice: createInvoice(invoiceId, payerOrZero, address(0), amountWei, metadataUri).",
        "Create USDC invoice: createInvoice(invoiceId, payerOrZero, USDC, amountBaseUnits, metadataUri).",
        "Pay ETH: payNativeInvoice(invoiceId) with exact msg.value.",
        "Pay USDC: approve InvoiceBook, then payTokenInvoice(invoiceId).",
        "Cancel unpaid: issuer calls cancelInvoice(invoiceId).",
        "Proof: npm run smoke:live includes on-chain invoice settlement.",
      ].join("\n"),
    }],
  };
});

server.tool("x402_guide", "Return builder instructions for the ArcPay Arbitrum x402 payment-gated agent server.", {}, async () => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: [
        "ArcPay Arbitrum x402",
        `OrderBook: ${deployment.contracts.AgentOrderBook}`,
        `Registry: ${deployment.contracts.AgentRegistry}`,
        "Run: npm run x402",
        "Protected resource: GET /agent/:slug/work",
        "No order returns HTTP 402 with exact ETH payment requirements.",
        "Pay by calling AgentOrderBook.createOrder(agentId, requestUri) with quoted msg.value.",
        "Verify: POST /x402/verify with { orderId, agentSlug }.",
        "Unlock: GET /agent/:slug/work?orderId=... after Fulfilled or Settled.",
        "Proof: npm run smoke:x402.",
      ].join("\n"),
    }],
  };
});

server.tool("execution_handoff", "Return an Arbitrum execution handoff payload for GMX, ZeroDev smart accounts, Dune evidence, or manual execution.", {
  strategyName: z.string().optional(),
  agentSlug: z.string().optional(),
  budgetEth: z.string().optional(),
  adapter: z.string().optional(),
}, async ({ strategyName = "arcpay-arbitrum-cfo", agentSlug = "treasury-router", budgetEth = "0.02", adapter = "GMX execution intent" }) => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        protocol: "arcpay-arbitrum-execution-handoff",
        chain: "arbitrum-sepolia",
        chainId: 421614,
        adapter,
        executionAddress: "set-after-wallet-or-smart-account-connection",
        primaryVenue: "GMX",
        strategyName,
        agentSlug,
        objective: "Execute only policy-approved Arbitrum treasury work through ArcPay x402, escrow, privacy, invoice, reputation, and audit modules.",
        constraints: {
          maxBudgetEth: budgetEth,
          allowedAssets: ["ETH", "USDC", "WETH"],
          allowedVenues: ["GMX", "ZeroDev smart account", "Dune evidence", "Manual signer"],
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
          identity8004: deployment.contracts.AgentIdentity8004,
          executionRouter: deployment.contracts.ArbitrumExecutionRouter,
        },
        setup: [
          "Register or select an ArcPay agent identity.",
          "Choose an execution adapter: GMX intent, ZeroDev smart account, Dune evidence, or manual signer.",
          "Create the x402 quote or escrow order before work starts.",
          "Execute only after policy approval and budget checks.",
          "Attach Arbiscan tx hash, x402 verification, Dune query link, or signed result evidence before marking the work complete.",
        ],
      }, null, 2),
    }],
  };
});

server.tool("gmx_execution_plan", "Create a policy-bounded GMX execution plan for an Arbitrum agent before any trade or hedge is signed.", {
  market: z.string().optional(),
  collateral: z.string().optional(),
  sizeUsd: z.string().optional(),
  maxLeverage: z.string().optional(),
}, async ({ market = "ETH/USD", collateral = "USDC", sizeUsd = "25", maxLeverage = "1.2x" }) => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
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
      }, null, 2),
    }],
  };
});

server.tool("zerodev_session_policy", "Return a ZeroDev smart-account session policy for bounded ArcPay agent actions.", {
  agentSlug: z.string().optional(),
  budgetEth: z.string().optional(),
  expiresInMinutes: z.number().optional(),
}, async ({ agentSlug = "treasury-router", budgetEth = "0.02", expiresInMinutes = 60 }) => {
  const deployment = readDeployment();
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
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
      }, null, 2),
    }],
  };
});

server.tool("dune_evidence_spec", "Return the Dune dashboard/query schema ArcPay expects for public Arbitrum proof analytics.", {}, async () => ({
  content: [{
    type: "text",
    text: JSON.stringify({
      protocol: "arcpay-dune-evidence",
      chain: "arbitrum-sepolia",
      eventFamilies: [
        "AgentIdentityRegistered",
        "AgentRegistered",
        "OrderCreated/OrderStatusChanged/OrderFulfilled",
        "ExecutionIntentProposed/Approved/Executed",
        "SpendRecorded",
        "Privacy intent events",
        "ReputationRecorded",
      ],
      dashboardCards: ["active agents", "x402 order volume", "execution intents by adapter", "policy approvals", "privacy intent lifecycle", "reputation scores"],
    }, null, 2),
  }],
}));

server.tool("fhenix_privacy_boundary", "Return the Fhenix confidential-compute boundary for ArcPay private treasury metadata.", {}, async () => ({
  content: [{
    type: "text",
    text: JSON.stringify({
      protocol: "arcpay-fhenix-privacy-boundary",
      chain: "arbitrum",
      privateInputs: ["counterparty notes", "agent prompt fragments", "risk memo", "invoice memo", "treasury strategy rationale"],
      publicOutputs: ["commitment", "nullifier", "evidence URI", "execution intent id", "Arbiscan tx hash"],
      boundary: "ArcPay PrivacyVault handles commitment/nullifier settlement; Fhenix is the confidential-compute adapter for encrypted policy and risk computation.",
    }, null, 2),
  }],
}));

server.tool("demo_path", "Return the operator demo path for ArcPay Arbitrum.", {}, async () => ({
  content: [{
    type: "text",
    text: [
      "Connect an EVM wallet to Arbitrum Sepolia.",
      "Register an agent on /agents.",
      "Set policy and allowlist the agent on /policies.",
      "Create and settle an escrowed agent order on /orders.",
      "Create/redeem claim codes and trigger webhook breaker on /operator.",
      "Request and fulfill risk oracle result on /oracle.",
      "Create and release encrypted Privacy Intents with nullifiers on /privacy.",
      "Create, pay, cancel, and sync ETH/USDC invoices on /invoices.",
      "Show /audit and /proofs.",
    ].join("\n"),
  }],
}));

server.tool("smoke_commands", "Return the verification commands operators can run locally and against Arbitrum Sepolia.", {}, async () => ({
  content: [{
    type: "text",
    text: [
      "npm run build:frontend",
      "npm test",
      "npm run check:worker",
      "npm run check:x402",
      "npm run smoke:auth",
      "npm run smoke:live",
      "npm run smoke:x402",
    ].join("\n"),
  }],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
