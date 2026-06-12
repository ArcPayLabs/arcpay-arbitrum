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
  arcpay-arbitrum order-id-guide         Explain how to obtain and test order ids
  arcpay-arbitrum onboard-agent <slug>   Print BYO-agent onboarding payload
  arcpay-arbitrum card-guide <slug>      Print USDC card setup plan
  arcpay-arbitrum policy-guide <slug>    Print workspace + per-agent policy plan
  arcpay-arbitrum evidence-template      Print audit evidence checklist
  arcpay-arbitrum execution-handoff      Print Arbitrum execution payload template
  arcpay-arbitrum gmx-plan               Print GMX execution plan template
  arcpay-arbitrum zerodev-policy         Print ZeroDev session policy template
  arcpay-arbitrum dune-spec              Print Dune analytics proof schema
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
      "2. GET https://arcpay-arbitrum.vercel.app/api/agent/:slug/work returns HTTP 402 requirements.",
      "3. Payer calls AgentOrderBook.createOrder(agentId, requestUri) with quoted msg.value.",
      "4. Read orderId from the OrderCreated event in the createOrder transaction receipt.",
      "5. Provider fulfills the order.",
      "6. GET /agent/:slug/work?orderId=... unlocks only after Fulfilled or Settled.",
      "",
      "Proof command: npm run smoke:x402",
    ].join("\n"));
  } else if (command === "order-id-guide") {
    const info = deployment();
    console.log([
      "ArcPay Arbitrum order id guide",
      "",
      `OrderBook: ${info.contracts.AgentOrderBook}`,
      "Function: createOrder(bytes32 agentId, string requestUri) payable returns (bytes32 orderId)",
      "",
      "How the id is generated on-chain:",
      "orderId = keccak256(abi.encodePacked(block.chainid, address(orderBook), requester, agentId, orderNonce))",
      "",
      "How to get it in the app:",
      "1. Quote x402 or open /orders.",
      "2. Sign createOrder in the wallet.",
      "3. Wait for the tx receipt.",
      "4. Parse the OrderCreated(orderId, agentId, requester, provider, amountWei, requestUri) event.",
      "5. Paste that orderId into /x402, /orders, /oracle, /reputation, or /audit.",
      "",
      "How to test it:",
      "curl https://arcpay-arbitrum.vercel.app/api/x402/verify -H \"content-type: application/json\" -d \"{\\\"orderId\\\":\\\"0x...\\\",\\\"agentSlug\\\":\\\"research-agent\\\"}\"",
      "curl \"https://arcpay-arbitrum.vercel.app/api/agent/research-agent/work?orderId=0x...\"",
    ].join("\n"));
  } else if (command === "onboard-agent") {
    const info = deployment();
    const slug = args[0] || "treasury-router";
    const endpoint = args[1] || `https://arcpay-arbitrum.vercel.app/api/agent/${slug}/work`;
    const priceEth = args[2] || "0.0005";
    console.log(JSON.stringify({
      protocol: "arcpay-arbitrum-agent-onboarding",
      network: info.network,
      chainId: info.chainId,
      agentSlug: slug,
      agentId: id(slug),
      endpoint,
      priceEth,
      contracts: {
        registry: info.contracts.AgentRegistry,
        orderBook: info.contracts.AgentOrderBook,
        policy: info.contracts.TreasuryPolicy,
        operatorControls: info.contracts.OperatorControls,
        spendCardVault: info.contracts.AgentSpendCardVault,
        reputation: info.contracts.AgentReputationBook,
        identity8004: info.contracts.AgentIdentity8004,
        executionRouter: info.contracts.ArbitrumExecutionRouter,
      },
      dashboardPath: "https://arcpay-arbitrum.vercel.app/app/agents",
      nextSteps: [
        "Register the slug/capabilities on AgentRegistry and optional ERC-8004 identity.",
        "Create or redeem a claim code in OperatorControls if the agent is external.",
        "Attach workspace policy and optional per-agent allowlist/limits.",
        "Quote the x402 endpoint, create an escrowed order, verify/fulfill, then record evidence in Audit.",
      ],
    }, null, 2));
  } else if (command === "card-guide") {
    const info = deployment();
    const slug = args[0] || "treasury-router";
    const agent = args[1] || "<agent-wallet-address>";
    const limit = args[2] || "5";
    const cardSlug = `${slug}-usdc-card`;
    console.log(JSON.stringify({
      protocol: "arcpay-arbitrum-usdc-card",
      network: info.network,
      chainId: info.chainId,
      cardSlug,
      cardId: keccak256(toUtf8Bytes(cardSlug)),
      agent,
      limitUsdc: limit,
      contracts: {
        spendCardVault: info.contracts.AgentSpendCardVault,
        usdc: info.usdcToken,
      },
      calls: [
        "USDC.approve(AgentSpendCardVault, amountBaseUnits)",
        "AgentSpendCardVault.createCard(cardId, agent, USDC, limitBaseUnits, label)",
        "AgentSpendCardVault.topUpCard(cardId, amountBaseUnits)",
        "AgentSpendCardVault.setCardStatus(cardId, true|false)",
        "AgentSpendCardVault.spendCard(cardId, recipient, amountBaseUnits, memo) by the assigned agent",
      ],
      proofRequired: ["cardId", "createCard tx hash", "approve tx hash", "topUpCard tx hash", "cards(cardId) state", "spend tx hash if used"],
    }, null, 2));
  } else if (command === "policy-guide") {
    const slug = args[0] || "treasury-router";
    const dailyLimit = args[1] || "10";
    console.log(JSON.stringify({
      protocol: "arcpay-arbitrum-policy-plan",
      agentSlug: slug,
      agentId: id(slug),
      workspacePolicy: {
        scope: "Global workspace controls",
        enforcedAcross: ["payments", "orders", "x402", "cards", "invoices", "privacy", "GMX", "ZeroDev", "Dune", "Fhenix"],
        defaultChecks: ["wallet required", "treasury pause", "allowed token", "allowed network", "risk floor", "per-transaction max", "daily max"],
      },
      agentPolicy: {
        scope: "Per-agent controls",
        dailyLimitEthOrUsdc: dailyLimit,
        allowedActions: ["x402 work", "escrow order", "USDC card spend", "GMX intent", "ZeroDev sponsored action"],
        evidenceRequired: ["tx hash", "x402 verification", "ArcPay order id", "GMX/ZeroDev/Dune/Fhenix evidence when applicable"],
      },
    }, null, 2));
  } else if (command === "evidence-template") {
    console.log([
      "ArcPay Arbitrum Evidence Checklist",
      "",
      "- Wallet address and chain id 421614.",
      "- Agent slug, agent id, ERC-8004 identity if used, registered endpoint, and capability metadata.",
      "- Policy snapshot: global workspace policy plus per-agent limits.",
      "- x402 quote response: HTTP status, payment requirements, request URI, amount.",
      "- Order evidence: createOrder tx hash, order id, state before/after fulfill, settle/refund tx.",
      "- Card evidence: card id, approve/top-up tx, card state, spend tx if used.",
      "- Privacy evidence: commitment, encrypted memo URI, create/release tx, nullifier.",
      "- Invoice evidence: invoice id, create/pay/cancel tx, payer and token state.",
      "- GMX evidence: execution intent, router tx hash, before/after balance, Dune/Arbiscan link.",
      "- ZeroDev evidence: userOp hash, sponsorship decision, transaction hash.",
      "- Audit page screenshot and Arbiscan links for every tx hash.",
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
        registry: info.contracts.AgentRegistry,
        orderBook: info.contracts.AgentOrderBook,
        policy: info.contracts.TreasuryPolicy,
        privacyVault: info.contracts.ArbitrumPrivacyVault,
        reputation: info.contracts.AgentReputationBook,
        identity8004: info.contracts.AgentIdentity8004,
        executionRouter: info.contracts.ArbitrumExecutionRouter,
      },
      setup: [
        "Register or select an ArcPay agent identity.",
        "Choose an execution adapter: GMX intent, ZeroDev smart account, Dune evidence, or manual signer.",
        "Create the x402 quote or escrow order before work starts.",
        "Execute only after policy approval and budget checks.",
        "Attach Arbiscan tx hash, x402 verification, Dune query link, or signed result evidence before marking the work complete.",
      ],
    }, null, 2));
  } else if (command === "gmx-plan") {
    const info = deployment();
    console.log(JSON.stringify({
      protocol: "arcpay-gmx-execution-plan",
      chain: "arbitrum-sepolia",
      venue: "GMX",
      market: args[0] || "ETH/USD",
      collateral: args[1] || "USDC",
      sizeUsd: args[2] || "25",
      maxLeverage: args[3] || "1.2x",
      controls: {
        requireArcPayPolicy: true,
        requireExecutionRouterIntent: true,
        requireOperatorApprovalForLeverage: true,
        requireArbiscanTxHash: true,
        requireDuneEvidenceLink: true,
      },
      contracts: {
        executionRouter: info.contracts.ArbitrumExecutionRouter,
        policy: info.contracts.TreasuryPolicy,
        orderBook: info.contracts.AgentOrderBook,
      },
    }, null, 2));
  } else if (command === "zerodev-policy") {
    const info = deployment();
    console.log(JSON.stringify({
      protocol: "arcpay-zerodev-session-policy",
      chain: "arbitrum-sepolia",
      agentSlug: args[0] || "treasury-router",
      accountAbstraction: "ZeroDev",
      sessionScope: {
        allowedContracts: [
          info.contracts.AgentOrderBook,
          info.contracts.TreasuryPolicy,
          info.contracts.ArbitrumExecutionRouter,
          info.contracts.ArbitrumPrivacyVault,
        ],
        maxBudgetEth: args[1] || "0.02",
        expiresInMinutes: Number(args[2] || 60),
        blockedActions: ["unbounded leverage", "unknown target contract", "execution without evidence URI"],
      },
    }, null, 2));
  } else if (command === "dune-spec") {
    console.log(JSON.stringify({
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
    }, null, 2));
  } else if (command === "fhenix-boundary") {
    console.log(JSON.stringify({
      protocol: "arcpay-fhenix-privacy-boundary",
      chain: "arbitrum",
      privateInputs: ["counterparty notes", "agent prompt fragments", "risk memo", "invoice memo", "treasury strategy rationale"],
      publicOutputs: ["commitment", "nullifier", "evidence URI", "execution intent id", "Arbiscan tx hash"],
      boundary: "ArcPay PrivacyVault handles commitment/nullifier settlement; Fhenix is the confidential-compute adapter for encrypted policy and risk computation.",
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
