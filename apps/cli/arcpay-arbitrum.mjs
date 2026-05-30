#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { id, keccak256, toUtf8Bytes } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDeploymentPath = path.join(process.cwd(), "deployments", "arbitrum-sepolia.json");
const packageDeploymentPath = path.join(__dirname, "deployment.json");

function deployment() {
  const file = fs.existsSync(repoDeploymentPath) ? repoDeploymentPath : packageDeploymentPath;
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
  arcpay-arbitrum execution-handoff      Print Arbitrum execution payload template
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
    console.log(JSON.stringify(deployment().contracts, null, 2));
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
      "1. Register an agent slug in AgentRegistry.",
      "2. GET https://arbitrum-x402.20.208.46.195.nip.io/agent/:slug/work returns HTTP 402 requirements.",
      "3. Payer calls AgentOrderBook.createOrder(agentId, requestUri) with quoted msg.value.",
      "4. Provider fulfills the order.",
      "5. GET /agent/:slug/work?orderId=... unlocks only after Fulfilled or Settled.",
      "",
      "Proof command: npm run smoke:x402",
    ].join("\n"));
  } else if (command === "execution-handoff") {
    const info = deployment();
    const strategyName = args[0] || "arcpay-arbitrum-cfo";
    const agentSlug = args[1] || "treasury-router";
    const budgetEth = args[2] || "0.02";
    const adapter = args[3] || "GMX execution intent";
    console.log(JSON.stringify({
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
        registry: info.contracts.AgentRegistry,
        orderBook: info.contracts.AgentOrderBook,
        policy: info.contracts.TreasuryPolicy,
        privacyVault: info.contracts.ArbitrumPrivacyVault,
        reputation: info.contracts.AgentReputationBook,
      },
      setup: [
        "Register or select an ArcPay agent identity.",
        "Choose an execution adapter: GMX intent, Stylus policy check, ZeroDev smart account, Dune evidence, or manual signer.",
        "Create the x402 quote or escrow order before work starts.",
        "Execute only after policy approval and budget checks.",
        "Attach Arbiscan tx hash, x402 verification, Dune query link, or signed result evidence before marking the work complete.",
      ],
    }, null, 2));
  } else if (command === "demo-path") {
    console.log([
      "1. Connect wallet and switch to Arbitrum Sepolia.",
      "2. Register a provider on /agents.",
      "3. Set policy and allowlist the agent on /policies.",
      "4. Create an escrowed order on /orders.",
      "5. Move order through accept -> processing -> fulfill -> settle or fail/refund.",
      "6. Create claim codes and webhook circuit breakers on /operator.",
      "7. Request risk scoring on /oracle.",
      "8. Create and release encrypted Privacy Intents on /privacy.",
      "9. Create, pay, cancel, and sync ETH/USDC invoices on /invoices.",
      "10. Show /audit, /status, and /proofs.",
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
          command: "arcpay-arbitrum-mcp",
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
