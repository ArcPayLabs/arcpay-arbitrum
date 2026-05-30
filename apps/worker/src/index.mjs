import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, formatEther } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.ARCPAY_ROOT ?? path.resolve(__dirname, "../../..");
const deployment = JSON.parse(fs.readFileSync(path.join(root, "deployments", "arbitrum-sepolia.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new JsonRpcProvider(rpcUrl, deployment.chainId);
const checkpointPath = process.env.ARCPAY_WORKER_CHECKPOINT_PATH ?? path.join(root, ".arcpay-arbitrum-worker-checkpoint.json");
const recordsTable = process.env.ARCPAY_RECORDS_TABLE ?? "arcpay_arbitrum_records";
const backfillBlocks = Number(process.env.ARCPAY_WORKER_BACKFILL_BLOCKS ?? "2500");
const pollMs = Number(process.env.ARCPAY_WORKER_POLL_MS ?? "12000");
const scanChunk = Number(process.env.ARCPAY_WORKER_SCAN_CHUNK ?? "500");
const ownerMode = process.env.ARCPAY_WORKER_OWNER_MODE ?? "event";
const fallbackOwner = process.env.ARCPAY_WORKER_FALLBACK_OWNER ?? "arbitrum-worker";

const orderAbi = [
  "event OrderCreated(bytes32 indexed orderId,bytes32 indexed agentId,address indexed requester,address provider,uint256 amountWei,string requestUri)",
  "event OrderStatusChanged(bytes32 indexed orderId,uint8 status)",
  "event OrderFulfilled(bytes32 indexed orderId,string resultUri)",
  "event OrderFailed(bytes32 indexed orderId,string reason)",
  "function orders(bytes32 orderId) view returns (bytes32 orderId,bytes32 agentId,address requester,address provider,uint256 amountWei,string requestUri,string resultUri,uint8 status,uint256 createdAt,uint256 updatedAt)",
];
const registryAbi = [
  "event AgentRegistered(bytes32 indexed agentId,address indexed owner,string name,uint256 priceWei)",
  "event AgentUpdated(bytes32 indexed agentId,string endpoint,string capabilities,uint256 priceWei,bool active)",
  "function agents(bytes32 agentId) view returns (address owner,string name,string endpoint,string capabilities,uint256 priceWei,bool active,uint256 createdAt,uint256 updatedAt)",
];
const policyAbi = [
  "event PolicyUpdated(address indexed operator,uint256 hourlyLimitWei,uint256 dailyLimitWei,uint256 weeklyLimitWei,uint256 approvalThresholdWei,uint8 allowedStartHourUtc,uint8 allowedEndHourUtc,bool emergencyPaused,bool allowlistEnabled)",
  "event AgentAllowanceUpdated(address indexed operator,bytes32 indexed agentId,bool allowed)",
  "event SpendApprovalUpdated(address indexed operator,bytes32 indexed orderId,bool approved)",
  "event SpendRecorded(address indexed operator,bytes32 indexed agentId,uint256 amountWei)",
];
const treasuryAbi = [
  "event Deposited(bytes32 indexed orderId,uint256 amountWei)",
  "event Settled(bytes32 indexed orderId,address indexed recipient,uint256 amountWei)",
  "event Refunded(bytes32 indexed orderId,address indexed recipient,uint256 amountWei)",
];
const cardAbi = [
  "event CardCreated(bytes32 indexed cardId,address indexed operator,address indexed agent,address token,uint256 limit,string label)",
  "event CardFunded(bytes32 indexed cardId,uint256 amount)",
  "event CardSpent(bytes32 indexed cardId,address indexed recipient,uint256 amount,string memo)",
  "event CardStatusUpdated(bytes32 indexed cardId,bool active)",
  "event CardLimitUpdated(bytes32 indexed cardId,uint256 limit)",
  "function cards(bytes32 cardId) view returns (address operator,address agent,address token,uint256 limit,uint256 balance,uint256 spent,bool active,string label,uint256 createdAt)",
];
const operatorAbi = [
  "event ClaimCodeCreated(bytes32 indexed claimHash,address indexed operator,bytes32 indexed agentId,string metadataUri,uint256 expiresAt)",
  "event ClaimCodeRedeemed(bytes32 indexed claimHash,address indexed redeemer)",
  "event WebhookFailure(bytes32 indexed originHash,uint256 failureCount,uint256 openedUntil)",
  "event WebhookSuccess(bytes32 indexed originHash)",
  "event WebhookCircuitReset(bytes32 indexed originHash)",
];
const privacyAbi = [
  "event PrivateIntentCreated(bytes32 indexed commitment,address indexed operator,address indexed token,uint256 amount,string encryptedMemoUri)",
  "event PrivateIntentReleased(bytes32 indexed commitment,bytes32 indexed nullifier,address indexed recipient)",
  "event PrivateIntentCancelled(bytes32 indexed commitment)",
  "function intents(bytes32 commitment) view returns (address operator,address token,uint256 amount,string encryptedMemoUri,bool released,bool cancelled,uint256 createdAt)",
];
const invoiceAbi = [
  "event InvoiceCreated(bytes32 indexed invoiceId,address indexed issuer,address indexed payer,address token,uint256 amount,string metadataUri)",
  "event InvoicePaid(bytes32 indexed invoiceId,address indexed payer,address token,uint256 amount)",
  "event InvoiceCancelled(bytes32 indexed invoiceId)",
  "function invoices(bytes32 invoiceId) view returns (bytes32 invoiceId,address issuer,address payer,address token,uint256 amount,string metadataUri,uint8 status,uint256 createdAt,uint256 paidAt,uint256 cancelledAt)",
];
const riskAbi = [
  "event RiskRequested(uint256 indexed requestId,bytes32 indexed orderId,address indexed requester,string prompt)",
  "event RiskFulfilled(uint256 indexed requestId,bytes32 indexed orderId,uint256 score,string verdict,string evidenceUri)",
  "function results(uint256 requestId) view returns (uint256 requestId,bytes32 orderId,address requester,uint256 score,string verdict,string evidenceUri,bool fulfilled,uint8 responseStatus,uint256 requestedAt,uint256 fulfilledAt)",
];
const reputationAbi = [
  "event ReputationRecorded(bytes32 indexed reviewId,bytes32 indexed agentId,bytes32 indexed orderId,address reviewer,uint8 score,bool disputed,string evidenceUri)",
  "function reviews(bytes32 reviewId) view returns (bytes32 orderId,bytes32 agentId,address reviewer,uint8 score,bool disputed,string evidenceUri,uint256 createdAt)",
  "function reputations(bytes32 agentId) view returns (uint256 reviewCount,uint256 totalScore,uint256 completedCount,uint256 disputeCount,uint256 lastUpdatedAt)",
  "function reputationScore(bytes32 agentId) view returns (uint256)",
];
const identityAbi = [
  "event AgentIdentityRegistered(uint256 indexed tokenId,bytes32 indexed agentId,address indexed owner,string metadataUri,string serviceEndpoint,string trustModel)",
  "event AgentIdentityUpdated(uint256 indexed tokenId,string metadataUri,string serviceEndpoint,string trustModel,bool active)",
  "event ReputationNonceAdvanced(uint256 indexed tokenId,uint256 reputationNonce)",
  "function identities(uint256 tokenId) view returns (uint256 tokenId,bytes32 agentId,address owner,string metadataUri,string serviceEndpoint,string trustModel,bool active,uint256 reputationNonce,uint256 createdAt,uint256 updatedAt)",
];
const executionAbi = [
  "event ExecutionIntentProposed(bytes32 indexed intentId,bytes32 indexed agentId,address indexed operator,uint8 adapter,address target,uint256 maxValueWei,bytes32 calldataHash,string policyUri)",
  "event ExecutionIntentApproved(bytes32 indexed intentId,string evidenceUri)",
  "event ExecutionIntentExecuted(bytes32 indexed intentId,bytes32 txHashOrReceiptHash,string evidenceUri)",
  "event ExecutionIntentCancelled(bytes32 indexed intentId,string reason)",
  "function intents(bytes32 intentId) view returns (bytes32 intentId,bytes32 agentId,address operator,uint8 adapter,address target,uint256 maxValueWei,bytes32 calldataHash,string policyUri,string evidenceUri,uint8 status,uint256 createdAt,uint256 updatedAt)",
];

const sources = [
  { key: "agents", address: deployment.contracts.AgentRegistry, abi: registryAbi, contractName: "AgentRegistry" },
  { key: "policy", address: deployment.contracts.TreasuryPolicy, abi: policyAbi, contractName: "TreasuryPolicy" },
  { key: "treasury", address: deployment.contracts.AgentTreasury, abi: treasuryAbi, contractName: "AgentTreasury" },
  { key: "orders", address: deployment.contracts.AgentOrderBook, abi: orderAbi, contractName: "AgentOrderBook" },
  { key: "cards", address: deployment.contracts.AgentSpendCardVault, abi: cardAbi, contractName: "AgentSpendCardVault" },
  { key: "operator", address: deployment.contracts.OperatorControls, abi: operatorAbi, contractName: "OperatorControls" },
  { key: "privacy", address: deployment.contracts.ArbitrumPrivacyVault, abi: privacyAbi, contractName: "ArbitrumPrivacyVault" },
  { key: "invoice", address: deployment.contracts.AgentInvoiceBook, abi: invoiceAbi, contractName: "AgentInvoiceBook" },
  { key: "risk", address: deployment.contracts.ArbitrumAgentRiskOracle, abi: riskAbi, contractName: "ArbitrumAgentRiskOracle" },
  { key: "reputation", address: deployment.contracts.AgentReputationBook, abi: reputationAbi, contractName: "AgentReputationBook" },
  { key: "identity", address: deployment.contracts.AgentIdentity8004, abi: identityAbi, contractName: "AgentIdentity8004" },
  { key: "execution", address: deployment.contracts.ArbitrumExecutionRouter, abi: executionAbi, contractName: "ArbitrumExecutionRouter" },
].filter((source) => Boolean(source.address)).map((source) => ({ ...source, contract: new Contract(source.address, source.abi, provider) }));

let checkpoint = readCheckpoint();
let running = false;

logJson({
  service: "arcpay-arbitrum-worker",
  mode: hasSupabase() ? "supabase" : "stdout",
  ownerMode,
  table: recordsTable,
  network: deployment.network,
  chainId: deployment.chainId,
  rpcUrl,
  checkpointPath,
  contracts: deployment.contracts,
  startedAt: new Date().toISOString(),
});

await scanOnce();
if (process.env.ARCPAY_WORKER_ONCE === "true") {
  process.exit(0);
}
setInterval(() => {
  void scanOnce();
}, pollMs);

async function scanOnce() {
  if (running) return;
  running = true;
  try {
    const latest = await provider.getBlockNumber();
    const from = Math.max(0, (checkpoint.lastBlock ?? Math.max(0, latest - backfillBlocks)) + 1);
    if (from > latest) return;

    for (let start = from; start <= latest; start += scanChunk) {
      const end = Math.min(latest, start + scanChunk - 1);
      await scanRange(start, end);
      checkpoint.lastBlock = end;
      writeCheckpoint(checkpoint);
    }
  } catch (error) {
    logJson({
      level: "error",
      service: "arcpay-arbitrum-worker",
      error: error?.shortMessage || error?.message || String(error),
      at: new Date().toISOString(),
    }, "error");
  } finally {
    running = false;
  }
}

async function scanRange(fromBlock, toBlock) {
  for (const source of sources) {
    const logs = await source.contract.queryFilter("*", fromBlock, toBlock);
    for (const event of logs) {
      const record = await eventToRecord(source, event);
      await persistRecord(record);
    }
  }
}

async function eventToRecord(source, event) {
  const args = namedArgs(event.args ?? {});
  const base = {
    eventName: event.fragment?.name ?? "Unknown",
    source: source.key,
    contractName: source.contractName,
    contractAddress: source.address,
    txHash: event.transactionHash,
    logIndex: event.index ?? event.logIndex ?? 0,
    blockNumber: event.blockNumber,
    createdAt: new Date().toISOString(),
    args,
  };

  if (source.key === "orders") return orderRecord(source.contract, base);
  if (source.key === "agents") return agentRecord(source.contract, base);
  if (source.key === "policy") return policyRecord(base);
  if (source.key === "treasury") return treasuryRecord(base);
  if (source.key === "cards") return cardRecord(source.contract, base);
  if (source.key === "operator") return operatorRecord(base);
  if (source.key === "privacy") return privacyRecord(source.contract, base);
  if (source.key === "invoice") return invoiceRecord(source.contract, base);
  if (source.key === "risk") return riskRecord(source.contract, base);
  if (source.key === "reputation") return reputationRecord(source.contract, base);
  if (source.key === "identity") return identityRecord(source.contract, base);
  if (source.key === "execution") return executionRecord(source.contract, base);
  return fallbackRecord(base);
}

async function agentRecord(contract, base) {
  const agentId = base.args.agentId;
  let agent;
  try {
    if (agentId) agent = await contract.agents(agentId);
  } catch {
    agent = null;
  }
  const owner = agent?.owner ?? base.args.owner;
  const priceWei = agent?.priceWei ?? base.args.priceWei;
  const name = agent?.name ?? base.args.name;
  return {
    ...base,
    owner: ownerFor(owner),
    type: "agent",
    title: agentId ? `${base.eventName} ${String(name || short(agentId))}` : base.eventName,
    status: agent?.active === false ? "inactive" : eventStatus(base.eventName),
    amount: priceWei !== undefined ? `${formatEther(priceWei)} ETH` : undefined,
  };
}

function policyRecord(base) {
  const amountWei = base.args.amountWei ?? base.args.dailyLimitWei ?? base.args.approvalThresholdWei;
  const status = base.args.emergencyPaused === true ? "paused" : eventStatus(base.eventName);
  return {
    ...base,
    owner: ownerFor(base.args.operator),
    type: "policy",
    title: base.args.agentId ? `${base.eventName} ${short(base.args.agentId)}` : base.eventName,
    status,
    amount: amountWei !== undefined ? `${formatEther(amountWei)} ETH` : undefined,
  };
}

function treasuryRecord(base) {
  const amountWei = base.args.amountWei;
  return {
    ...base,
    owner: ownerFor(base.args.recipient),
    type: "treasury",
    title: base.args.orderId ? `${base.eventName} ${short(base.args.orderId)}` : base.eventName,
    status: eventStatus(base.eventName),
    amount: amountWei !== undefined ? `${formatEther(amountWei)} ETH` : undefined,
  };
}

async function orderRecord(contract, base) {
  const orderId = base.args.orderId;
  let order;
  try {
    if (orderId) order = await contract.orders(orderId);
  } catch {
    order = null;
  }

  const requester = order?.requester ?? base.args.requester;
  const provider = order?.provider ?? base.args.provider;
  const amountWei = order?.amountWei ?? base.args.amountWei;
  const status = base.args.status !== undefined ? ORDER_STATUS[Number(base.args.status)] ?? String(base.args.status) : eventStatus(base.eventName);

  return {
    ...base,
    owner: ownerFor(requester || provider),
    type: "order",
    title: orderId ? `${base.eventName} ${short(orderId)}` : base.eventName,
    status: String(status).toLowerCase(),
    amount: amountWei !== undefined ? `${formatEther(amountWei)} ETH` : undefined,
  };
}

async function cardRecord(contract, base) {
  const cardId = base.args.cardId;
  let card;
  try {
    if (cardId) card = await contract.cards(cardId);
  } catch {
    card = null;
  }
  const owner = card?.operator ?? base.args.operator ?? base.args.recipient;
  const amount = base.args.amount ?? base.args.limit;
  return {
    ...base,
    owner: ownerFor(owner),
    type: "card",
    title: cardId ? `${base.eventName} ${short(cardId)}` : base.eventName,
    status: eventStatus(base.eventName),
    amount: amount !== undefined ? `${amount.toString()} token units` : undefined,
  };
}

function operatorRecord(base) {
  return {
    ...base,
    owner: ownerFor(base.args.operator ?? base.args.redeemer),
    type: "operator",
    title: base.args.claimHash ? `${base.eventName} ${short(base.args.claimHash)}` : base.eventName,
    status: eventStatus(base.eventName),
  };
}

async function privacyRecord(contract, base) {
  const commitment = base.args.commitment;
  let intent;
  try {
    if (commitment) intent = await contract.intents(commitment);
  } catch {
    intent = null;
  }
  const owner = intent?.operator ?? base.args.operator ?? base.args.recipient;
  const amount = intent?.amount ?? base.args.amount;
  const token = intent?.token ?? base.args.token;
  return {
    ...base,
    owner: ownerFor(owner),
    type: "privacy",
    title: commitment ? `${base.eventName} ${short(commitment)}` : base.eventName,
    status: eventStatus(base.eventName),
    amount: amount !== undefined ? `${amount.toString()} ${isNative(token) ? "wei" : "token units"}` : undefined,
  };
}

async function invoiceRecord(contract, base) {
  const invoiceId = base.args.invoiceId;
  let invoice;
  try {
    if (invoiceId) invoice = await contract.invoices(invoiceId);
  } catch {
    invoice = null;
  }
  const issuer = invoice?.issuer ?? base.args.issuer;
  const payer = invoice?.payer ?? base.args.payer;
  const token = invoice?.token ?? base.args.token;
  const amount = invoice?.amount ?? base.args.amount;
  const status = invoice?.status !== undefined ? INVOICE_STATUS[Number(invoice.status)] ?? eventStatus(base.eventName) : eventStatus(base.eventName);
  return {
    ...base,
    owner: ownerFor(issuer || payer),
    type: "invoice",
    title: invoiceId ? `${base.eventName} ${short(invoiceId)}` : base.eventName,
    status,
    amount: amount !== undefined ? `${amount.toString()} ${isNative(token) ? "wei" : "token units"}` : undefined,
  };
}

async function riskRecord(contract, base) {
  const requestId = base.args.requestId;
  let result;
  try {
    if (requestId !== undefined) result = await contract.results(requestId);
  } catch {
    result = null;
  }
  const requester = result?.requester ?? base.args.requester;
  const verdict = base.args.verdict ?? result?.verdict;
  return {
    ...base,
    owner: ownerFor(requester),
    type: "risk",
    title: requestId !== undefined ? `${base.eventName} #${requestId.toString()}` : base.eventName,
    status: verdict ? String(verdict).toLowerCase() : eventStatus(base.eventName),
    amount: base.args.score !== undefined ? `score ${base.args.score.toString()}` : undefined,
  };
}

async function reputationRecord(contract, base) {
  const reviewId = base.args.reviewId;
  const agentId = base.args.agentId;
  let score;
  try {
    if (agentId) score = await contract.reputationScore(agentId);
  } catch {
    score = base.args.score;
  }
  return {
    ...base,
    owner: ownerFor(base.args.reviewer),
    type: "reputation",
    title: reviewId ? `${base.eventName} ${short(reviewId)}` : base.eventName,
    status: base.args.disputed ? "disputed" : eventStatus(base.eventName),
    amount: score !== undefined ? `score ${score.toString()}` : undefined,
  };
}

async function identityRecord(contract, base) {
  const tokenId = base.args.tokenId;
  let identity;
  try {
    if (tokenId !== undefined) identity = await contract.identities(tokenId);
  } catch {
    identity = null;
  }
  const owner = identity?.owner ?? base.args.owner;
  const agentId = identity?.agentId ?? base.args.agentId;
  return {
    ...base,
    owner: ownerFor(owner),
    type: "identity",
    title: agentId ? `${base.eventName} ${short(agentId)}` : base.eventName,
    status: identity?.active === false ? "inactive" : eventStatus(base.eventName),
    amount: tokenId !== undefined ? `token ${tokenId.toString()}` : undefined,
  };
}

async function executionRecord(contract, base) {
  const intentId = base.args.intentId;
  let intent;
  try {
    if (intentId) intent = await contract.intents(intentId);
  } catch {
    intent = null;
  }
  const operator = intent?.operator ?? base.args.operator;
  const value = intent?.maxValueWei ?? base.args.maxValueWei;
  const status = intent?.status !== undefined ? EXECUTION_STATUS[Number(intent.status)] ?? eventStatus(base.eventName) : eventStatus(base.eventName);
  return {
    ...base,
    owner: ownerFor(operator),
    type: "execution",
    title: intentId ? `${base.eventName} ${short(intentId)}` : base.eventName,
    status,
    amount: value !== undefined ? `${formatEther(value)} ETH` : undefined,
  };
}

function fallbackRecord(base) {
  return {
    ...base,
    owner: ownerFor(),
    type: base.source,
    title: base.eventName,
    status: "observed",
  };
}

async function persistRecord(record) {
  const payload = {
    id: eventId(record),
    owner: record.owner,
    type: record.type,
    title: record.title,
    status: record.status,
    amount: record.amount ?? null,
    tx_hash: record.txHash,
    created_at: record.createdAt,
  };

  if (!hasSupabase()) {
    logJson({ ...record, persisted: false });
    return;
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${recordsTable}`, {
    method: "POST",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    logJson({ level: "error", event: record.eventName, txHash: record.txHash, status: response.status, body }, "error");
    return;
  }

  logJson({ ...record, persisted: true });
}

function eventId(record) {
  const seed = `${deployment.chainId}:${record.contractAddress}:${record.txHash}:${record.logIndex}`;
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function ownerFor(value) {
  if (ownerMode === "fallback") return fallbackOwner;
  return value && typeof value === "string" && value !== "0x0000000000000000000000000000000000000000" ? value.toLowerCase() : fallbackOwner;
}

function eventStatus(name) {
  return String(name || "observed").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function namedArgs(args) {
  return Object.fromEntries(Object.entries(args).filter(([key]) => Number.isNaN(Number(key))));
}

function short(value) {
  const text = String(value ?? "");
  return text ? `${text.slice(0, 10)}...${text.slice(-4)}` : "";
}

function isNative(value) {
  return !value || String(value).toLowerCase() === "0x0000000000000000000000000000000000000000";
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function readCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  } catch {
    return {};
  }
}

function writeCheckpoint(next) {
  fs.writeFileSync(checkpointPath, JSON.stringify(next, null, 2));
}

function logJson(value, stream = "log") {
  const line = JSON.stringify(value, (_key, next) => typeof next === "bigint" ? next.toString() : next);
  if (stream === "error") console.error(line);
  else console.log(line);
}

const ORDER_STATUS = ["pending", "accepted", "processing", "fulfilled", "settled", "refunded", "failed"];
const INVOICE_STATUS = ["pending", "paid", "cancelled"];
const EXECUTION_STATUS = ["proposed", "approved", "executed", "cancelled"];
