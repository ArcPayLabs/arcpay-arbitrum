#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { id, keccak256, toUtf8Bytes } from "ethers";

const root = process.cwd();
const deploymentPath = path.join(root, "deployments", "arbitrum-sepolia.json");

function deployment() {
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Missing ${deploymentPath}. Run npm run deploy:arbitrum first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

function usage() {
  console.log(`ArcPay Arbitrum CLI

Commands:
  arcpay-arbitrum contracts              Print deployed Arbitrum addresses
  arcpay-arbitrum wallet                 Print network wallet instructions
  arcpay-arbitrum agent-id <slug>        Derive bytes32 agent id
  arcpay-arbitrum invoice-id <publicId>  Derive bytes32 invoice id
  arcpay-arbitrum claim-hash <code>      Derive claim-code hash
  arcpay-arbitrum privacy-commit <text>  Derive Privacy Intent commitment/nullifier
  arcpay-arbitrum privacy-abi            Print Privacy Intent contract ABI
  arcpay-arbitrum privacy-guide          Print builder integration guide
  arcpay-arbitrum invoice-guide          Print invoice settlement guide
  arcpay-arbitrum x402-guide             Print x402 HTTP payment gate guide
  arcpay-arbitrum execution-handoff      Print agent execution handoff payload
  arcpay-arbitrum gmx-plan               Print GMX policy-bounded execution plan
  arcpay-arbitrum zerodev-policy         Print ZeroDev sponsorship/session policy
  arcpay-arbitrum dune-spec              Print Dune evidence dashboard schema
  arcpay-arbitrum fhenix-boundary        Print Fhenix privacy boundary
  arcpay-arbitrum demo-path              Print operator demo steps
  arcpay-arbitrum smoke                  Print smoke-test commands
  arcpay-arbitrum mcp-config             Print MCP host config
`);
}

const [, , command, ...args] = process.argv;

try {
  if (!command || command === "help" || command === "--help") {
    usage();
  } else if (command === "contracts") {
    const info = deployment();
    console.log(JSON.stringify(info.contracts, null, 2));
  } else if (command === "wallet") {
    console.log("Add Arbitrum Sepolia to an EVM wallet:");
    console.log("Chain ID: 421614 / 0x66eee");
    console.log("RPC: https://sepolia-rollup.arbitrum.io/rpc");
    console.log("Currency: ETH");
    console.log("Explorer: https://sepolia.arbiscan.io");
  } else if (command === "agent-id") {
    console.log(id(args.join(" ") || "agent"));
  } else if (command === "invoice-id") {
    console.log(keccak256(toUtf8Bytes(args.join(" ") || "invoice")));
  } else if (command === "claim-hash") {
    console.log(keccak256(toUtf8Bytes(args.join(" "))));
  } else if (command === "privacy-commit") {
    console.log(keccak256(toUtf8Bytes(args.join(" "))));
  } else if (command === "privacy-abi") {
    console.log(JSON.stringify([
      "function createNativeIntent(bytes32 commitment,string encryptedMemoUri) payable",
      "function createTokenIntent(bytes32 commitment,address token,uint256 amount,string encryptedMemoUri)",
      "function releaseIntent(bytes32 commitment,bytes32 nullifier,address recipient)",
      "function cancelIntent(bytes32 commitment)",
      "function intents(bytes32 commitment) view returns (address operator,address token,uint256 amount,string encryptedMemoUri,bool released,bool cancelled,uint256 createdAt)",
    ], null, 2));
  } else if (command === "privacy-guide") {
    const info = deployment();
    console.log([
      "ArcPay Privacy Intents for Arbitrum",
      "",
      `Vault: ${info.contracts.ArbitrumPrivacyVault}`,
      `USDC: ${info.usdcToken}`,
      "",
      "1. commitment = keccak256(secret)",
      "2. nullifier = keccak256(releaseSecret)",
      "3. approve USDC to the vault for token intents",
      "4. call createTokenIntent(commitment, USDC, amount, encryptedMemoUri)",
      "5. later call releaseIntent(commitment, nullifier, recipient)",
      "",
      "Privacy boundary: metadata and recipient are hidden during intent phase; release transfer is public.",
    ].join("\n"));
  } else if (command === "invoice-guide") {
    const info = deployment();
    console.log([
      "ArcPay Arbitrum Invoices",
      "",
      `InvoiceBook: ${info.contracts.AgentInvoiceBook}`,
      `USDC: ${info.usdcToken}`,
      "",
      "1. invoiceId = keccak256(publicInvoiceId).",
      "2. ETH invoice: createInvoice(invoiceId, payerOrZero, address(0), amountWei, metadataUri).",
      "3. USDC invoice: createInvoice(invoiceId, payerOrZero, USDC, amountBaseUnits, metadataUri).",
      "4. Payer signs payNativeInvoice(invoiceId) with exact msg.value or approves USDC then payTokenInvoice(invoiceId).",
      "5. Issuer can cancel unpaid invoices with cancelInvoice(invoiceId).",
      "",
      "Proof command: npm run smoke:live",
    ].join("\n"));
  } else if (command === "x402-guide") {
    const info = deployment();
    console.log([
      "ArcPay Arbitrum x402",
      "",
      `Registry: ${info.contracts.AgentRegistry}`,
      `OrderBook: ${info.contracts.AgentOrderBook}`,
      "",
      "1. Run npm run x402.",
      "2. Register an agent slug in AgentRegistry.",
      "3. GET /agent/:slug/work returns HTTP 402 with exact ETH payment requirements.",
      "4. Payer calls AgentOrderBook.createOrder(agentId, requestUri) with quoted msg.value.",
      "5. Provider fulfills the order.",
      "6. GET /agent/:slug/work?orderId=... unlocks only after Fulfilled or Settled.",
      "",
      "Proof command: npm run smoke:x402",
    ].join("\n"));
  } else if (command === "execution-handoff") {
    const info = deployment();
    const agentSlug = args[0] || "treasury-router";
    console.log(JSON.stringify({
      protocol: "arcpay-arbitrum-execution-handoff",
      chain: "arbitrum-sepolia",
      chainId: 421614,
      agentSlug,
      objective: "Execute only policy-approved Arbitrum treasury work through ArcPay x402, escrow, privacy, invoice, reputation, and audit modules.",
      endpoints: {
        app: "https://arcpay-arbitrum.vercel.app",
        x402: `https://arcpay-arbitrum.vercel.app/api/agent/${encodeURIComponent(agentSlug)}/work`,
        status: "https://arcpay-arbitrum.vercel.app/api/status",
        zerodevPolicy: "https://arcpay-arbitrum.vercel.app/api/zerodev/sponsor-policy",
      },
      contracts: {
        registry: info.contracts.AgentRegistry,
        orderBook: info.contracts.AgentOrderBook,
        policy: info.contracts.TreasuryPolicy,
        executionRouter: info.contracts.ArbitrumExecutionRouter,
        privacyVault: info.contracts.ArbitrumPrivacyVault,
        reputation: info.contracts.AgentReputationBook,
      },
      evidenceRequired: ["Arbiscan tx hash", "ArcPay order id", "x402 verification response", "Dune query/dashboard link"],
    }, null, 2));
  } else if (command === "gmx-plan") {
    const info = deployment();
    console.log(JSON.stringify({
      protocol: "arcpay-gmx-execution-plan",
      chain: "arbitrum-sepolia",
      venue: "GMX",
      adapter: "Execution intent first; wallet or smart account signs only after ArcPay policy approval.",
      contracts: {
        executionRouter: info.contracts.ArbitrumExecutionRouter,
        policy: info.contracts.TreasuryPolicy,
        orderBook: info.contracts.AgentOrderBook,
      },
      controls: {
        requireOperatorApprovalForLeverage: true,
        requireDuneEvidenceLink: true,
        requireArbiscanTxHash: true,
        rejectUnknownTargets: true,
      },
    }, null, 2));
  } else if (command === "zerodev-policy") {
    const info = deployment();
    console.log(JSON.stringify({
      protocol: "arcpay-zerodev-sponsorship-policy",
      chain: "arbitrum-sepolia",
      chainId: 421614,
      webhook: "https://arcpay-arbitrum.vercel.app/api/zerodev/sponsor-policy",
      dashboard: {
        processIfWebhookFails: false,
        timeoutMs: 5000,
        walletLimits: "funded beta/demo wallets only",
        chainLimits: "small daily Arbitrum Sepolia sponsorship cap",
      },
      allowedContracts: {
        registry: info.contracts.AgentRegistry,
        orderBook: info.contracts.AgentOrderBook,
        policy: info.contracts.TreasuryPolicy,
        executionRouter: info.contracts.ArbitrumExecutionRouter,
        privacyVault: info.contracts.ArbitrumPrivacyVault,
        invoiceBook: info.contracts.AgentInvoiceBook,
        cards: info.contracts.AgentSpendCardVault,
        reputation: info.contracts.AgentReputationBook,
        usdc: info.usdcToken,
      },
      caps: {
        maxNativeValueEth: process.env.ZERODEV_MAX_NATIVE_VALUE_ETH || "0.0005",
        maxTokenAmountUsdc: process.env.ZERODEV_MAX_TOKEN_AMOUNT || "1",
      },
    }, null, 2));
  } else if (command === "dune-spec") {
    const info = deployment();
    console.log(JSON.stringify({
      protocol: "arcpay-dune-evidence",
      chain: "arbitrum-sepolia",
      contracts: info.contracts,
      dashboards: [
        "x402 order lifecycle",
        "agent registrations and active service endpoints",
        "execution intents by adapter: GMX, ZeroDev, Stylus, Dune, Fhenix, Robinhood, manual",
        "privacy intent create/release/cancel events",
        "USDC invoice and spend-card activity",
        "reputation and dispute evidence",
      ],
      requiredEnv: ["DUNE_API_KEY", "DUNE_MCP_URL"],
    }, null, 2));
  } else if (command === "fhenix-boundary") {
    console.log(JSON.stringify({
      protocol: "arcpay-fhenix-privacy-boundary",
      purpose: "Keep private treasury metadata, policy context, and risk memo computation off public calldata while ArcPay anchors commitments and settlement evidence on Arbitrum.",
      privateInputs: ["counterparty notes", "agent prompt fragments", "risk memo", "invoice memo", "strategy rationale"],
      publicOutputs: ["commitment", "nullifier", "execution intent id", "evidence URI", "Arbiscan tx hash"],
      boundary: "ArcPay PrivacyVault is live commitment/nullifier infrastructure; Fhenix is the confidential-compute adapter path.",
    }, null, 2));
  } else if (command === "demo-path") {
    console.log([
      "1. Connect wallet and switch to Arbitrum Sepolia.",
      "2. Open /agents and register a provider.",
      "3. Open /policies, set limits, and allow the agent.",
      "4. Open /orders and create an escrowed order.",
      "5. Move order through accept -> processing -> fulfill -> settle or fail/refund.",
      "6. Open /operator for claim-code and webhook circuit-breaker proof.",
      "7. Open /oracle for Arbitrum agent risk callback proof.",
      "8. Open /privacy for encrypted-metadata payment intents and nullifier release.",
      "9. Open /invoices for ETH/USDC invoice creation, payment, cancellation, and sync.",
      "10. Open /proofs for deployed addresses and build commands.",
    ].join("\n"));
  } else if (command === "smoke") {
    console.log([
      "Run local + live verification:",
      "npm run build:frontend",
      "npm test",
      "npm run check:worker",
      "npm run check:x402",
      "npm run smoke:auth",
      "npm run smoke:live",
      "npm run smoke:x402",
    ].join("\n"));
  } else if (command === "mcp-config") {
    console.log(JSON.stringify({
      mcpServers: {
        "arcpay-arbitrum": {
          command: "node",
          args: [path.join(root, "apps", "mcp", "server.mjs")],
        },
      },
    }, null, 2));
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
