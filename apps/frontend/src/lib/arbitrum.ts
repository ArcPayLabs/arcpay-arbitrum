import { BrowserProvider, Contract, JsonRpcProvider, formatEther, id, keccak256, parseEther, toUtf8Bytes, type Eip1193Provider } from "ethers";
import deployment from "../deployment/arbitrum-sepolia.json";

export const ARBITRUM_CHAIN_ID = 421614;
export const ARBITRUM_CHAIN_ID_HEX = "0x66eee";
export const ARBITRUM_RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";
export const ARBITRUM_EXPLORER_URL = "https://sepolia.arbiscan.io";
const deployedContracts = deployment.contracts as Record<string, string>;
export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

export const CONTRACTS = {
  AgentRegistry: deployedContracts.AgentRegistry ?? NATIVE_TOKEN,
  TreasuryPolicy: deployedContracts.TreasuryPolicy ?? NATIVE_TOKEN,
  AgentTreasury: deployedContracts.AgentTreasury ?? NATIVE_TOKEN,
  AgentOrderBook: deployedContracts.AgentOrderBook ?? NATIVE_TOKEN,
  OperatorControls: deployedContracts.OperatorControls ?? NATIVE_TOKEN,
  ArbitrumAgentRiskOracle: deployedContracts.ArbitrumAgentRiskOracle ?? NATIVE_TOKEN,
  AgentSpendCardVault: deployedContracts.AgentSpendCardVault ?? NATIVE_TOKEN,
  ArbitrumPrivacyVault: deployedContracts.ArbitrumPrivacyVault ?? NATIVE_TOKEN,
  AgentInvoiceBook: deployedContracts.AgentInvoiceBook ?? NATIVE_TOKEN,
  AgentReputationBook: deployedContracts.AgentReputationBook ?? NATIVE_TOKEN,
  AgentIdentity8004: deployedContracts.AgentIdentity8004 ?? NATIVE_TOKEN,
  ArbitrumExecutionRouter: deployedContracts.ArbitrumExecutionRouter ?? NATIVE_TOKEN,
} as const;

export const DEPTH_CONTRACTS_READY =
  CONTRACTS.OperatorControls !== NATIVE_TOKEN && CONTRACTS.ArbitrumAgentRiskOracle !== NATIVE_TOKEN;
export const USDC_TOKEN_ADDRESS = (deployment as { usdcToken?: string }).usdcToken ?? NATIVE_TOKEN;
export const ARBITRUM_AGENT_PLATFORM_ADDRESS =
  (deployment as { arbitrumAgentPlatform?: string }).arbitrumAgentPlatform ?? NATIVE_TOKEN;
export const ARBITRUM_RISK_AGENT_ID =
  (deployment as { arbitrumRiskAgentId?: string }).arbitrumRiskAgentId ?? "13174292974160097713";

export const AGENT_REGISTRY_ABI = [
  "function registerAgent(bytes32 agentId,string name,string endpoint,string capabilities,uint256 priceWei)",
  "function updateAgent(bytes32 agentId,string endpoint,string capabilities,uint256 priceWei,bool active)",
  "function agents(bytes32 agentId) view returns (address owner,string name,string endpoint,string capabilities,uint256 priceWei,bool active,uint256 createdAt,uint256 updatedAt)",
  "function getOwnerAgents(address owner) view returns (bytes32[])",
  "event AgentRegistered(bytes32 indexed agentId,address indexed owner,string name,uint256 priceWei)",
] as const;

export const TREASURY_POLICY_ABI = [
  "function setPolicy(uint256 hourlyLimitWei,uint256 dailyLimitWei,uint256 weeklyLimitWei,uint256 approvalThresholdWei,uint8 allowedStartHourUtc,uint8 allowedEndHourUtc,bool emergencyPaused,bool allowlistEnabled)",
  "function setAgentAllowed(bytes32 agentId,bool allowed)",
  "function approveSpend(bytes32 orderId,bool approved)",
  "function policies(address operator) view returns (uint256 hourlyLimitWei,uint256 dailyLimitWei,uint256 weeklyLimitWei,uint256 approvalThresholdWei,uint8 allowedStartHourUtc,uint8 allowedEndHourUtc,bool emergencyPaused,bool allowlistEnabled)",
  "function allowedAgents(address operator,bytes32 agentId) view returns (bool)",
] as const;

export const LEGACY_TREASURY_POLICY_ABI = [
  "function setPolicy(uint256 hourlyLimitWei,uint256 dailyLimitWei,uint256 approvalThresholdWei,bool emergencyPaused,bool allowlistEnabled)",
  "function setAgentAllowed(bytes32 agentId,bool allowed)",
  "function policies(address operator) view returns (uint256 hourlyLimitWei,uint256 dailyLimitWei,uint256 approvalThresholdWei,bool emergencyPaused,bool allowlistEnabled)",
  "function allowedAgents(address operator,bytes32 agentId) view returns (bool)",
] as const;

export const AGENT_ORDER_BOOK_ABI = [
  "function createOrder(bytes32 agentId,string requestUri) payable returns (bytes32 orderId)",
  "function acceptOrder(bytes32 orderId)",
  "function markProcessing(bytes32 orderId)",
  "function fulfillOrder(bytes32 orderId,string resultUri)",
  "function settleOrder(bytes32 orderId)",
  "function refundOrder(bytes32 orderId)",
  "function failOrder(bytes32 orderId,string reason)",
  "function orders(bytes32 orderId) view returns (bytes32 orderId,bytes32 agentId,address requester,address provider,uint256 amountWei,string requestUri,string resultUri,uint8 status,uint256 createdAt,uint256 updatedAt)",
  "event OrderCreated(bytes32 indexed orderId,bytes32 indexed agentId,address indexed requester,address provider,uint256 amountWei,string requestUri)",
] as const;

export const OPERATOR_CONTROLS_ABI = [
  "function createClaimCode(bytes32 claimHash,bytes32 agentId,string metadataUri,uint256 ttlSeconds)",
  "function redeemClaimCode(string code) returns (bytes32 claimHash,bytes32 agentId)",
  "function recordWebhookSuccess(bytes32 originHash)",
  "function recordWebhookFailure(bytes32 originHash)",
  "function resetWebhookCircuit(bytes32 originHash)",
  "function isWebhookOpen(bytes32 originHash) view returns (bool)",
] as const;

export const RISK_ORACLE_ABI = [
  "function requestRisk(bytes32 orderId,string prompt) payable returns (uint256 requestId)",
  "function ownerFulfillForDemo(uint256 requestId,uint256 score,string verdict,string evidenceUri)",
  "function results(uint256 requestId) view returns (uint256 requestId,bytes32 orderId,address requester,uint256 score,string verdict,string evidenceUri,bool fulfilled,uint8 responseStatus,uint256 requestedAt,uint256 fulfilledAt)",
  "function pricePerAgentWei() view returns (uint256)",
  "function subcommitteeSize() view returns (uint256)",
  "event RiskRequested(uint256 indexed requestId,bytes32 indexed orderId,address indexed requester,string prompt)",
  "event RiskFulfilled(uint256 indexed requestId,bytes32 indexed orderId,uint256 score,string verdict,string evidenceUri)",
] as const;

export const ARBITRUM_AGENT_PLATFORM_ABI = [
  "function getRequestDeposit() view returns (uint256)",
] as const;

export const SPEND_CARD_VAULT_ABI = [
  "function createCard(bytes32 cardId,address agent,address token,uint256 limit,string label)",
  "function topUpCard(bytes32 cardId,uint256 amount)",
  "function setCardStatus(bytes32 cardId,bool active)",
  "function setCardLimit(bytes32 cardId,uint256 limit)",
  "function spendCard(bytes32 cardId,address recipient,uint256 amount,string memo)",
  "function cards(bytes32 cardId) view returns (address operator,address agent,address token,uint256 limit,uint256 balance,uint256 spent,bool active,string label,uint256 createdAt)",
] as const;

export const ERC20_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
] as const;

export const PRIVACY_VAULT_ABI = [
  "function createNativeIntent(bytes32 commitment,string encryptedMemoUri) payable",
  "function createTokenIntent(bytes32 commitment,address token,uint256 amount,string encryptedMemoUri)",
  "function releaseIntent(bytes32 commitment,bytes32 nullifier,address recipient)",
  "function cancelIntent(bytes32 commitment)",
  "function intents(bytes32 commitment) view returns (address operator,address token,uint256 amount,string encryptedMemoUri,bool released,bool cancelled,uint256 createdAt)",
] as const;

export const INVOICE_BOOK_ABI = [
  "function createInvoice(bytes32 invoiceId,address payer,address token,uint256 amount,string metadataUri)",
  "function payNativeInvoice(bytes32 invoiceId) payable",
  "function payTokenInvoice(bytes32 invoiceId)",
  "function cancelInvoice(bytes32 invoiceId)",
  "function invoices(bytes32 invoiceId) view returns (bytes32 invoiceId,address issuer,address payer,address token,uint256 amount,string metadataUri,uint8 status,uint256 createdAt,uint256 paidAt,uint256 cancelledAt)",
  "event InvoiceCreated(bytes32 indexed invoiceId,address indexed issuer,address indexed payer,address token,uint256 amount,string metadataUri)",
  "event InvoicePaid(bytes32 indexed invoiceId,address indexed payer,address token,uint256 amount)",
  "event InvoiceCancelled(bytes32 indexed invoiceId)",
] as const;

export const REPUTATION_BOOK_ABI = [
  "function recordReview(bytes32 orderId,bytes32 agentId,uint8 score,bool disputed,string evidenceUri) returns (bytes32 reviewId)",
  "function reputations(bytes32 agentId) view returns (uint256 reviewCount,uint256 totalScore,uint256 completedCount,uint256 disputeCount,uint256 lastUpdatedAt)",
  "function reviews(bytes32 reviewId) view returns (bytes32 orderId,bytes32 agentId,address reviewer,uint8 score,bool disputed,string evidenceUri,uint256 createdAt)",
  "function reviewedBy(bytes32 orderId,address reviewer) view returns (bool)",
  "function reputationScore(bytes32 agentId) view returns (uint256)",
  "event ReputationRecorded(bytes32 indexed reviewId,bytes32 indexed agentId,bytes32 indexed orderId,address reviewer,uint8 score,bool disputed,string evidenceUri)",
] as const;

export const AGENT_IDENTITY_8004_ABI = [
  "function registerIdentity(bytes32 agentId,string metadataUri,string serviceEndpoint,string trustModel) returns (uint256 tokenId)",
  "function updateIdentity(uint256 tokenId,string metadataUri,string serviceEndpoint,string trustModel,bool active)",
  "function advanceReputationNonce(uint256 tokenId) returns (uint256 reputationNonce)",
  "function requireActiveIdentity(bytes32 agentId) view returns (uint256 tokenId,address owner)",
  "function tokenByAgentId(bytes32 agentId) view returns (uint256)",
  "function identities(uint256 tokenId) view returns (uint256 tokenId,bytes32 agentId,address owner,string metadataUri,string serviceEndpoint,string trustModel,bool active,uint256 reputationNonce,uint256 createdAt,uint256 updatedAt)",
  "event AgentIdentityRegistered(uint256 indexed tokenId,bytes32 indexed agentId,address indexed owner,string metadataUri,string serviceEndpoint,string trustModel)",
] as const;

export const EXECUTION_ROUTER_ABI = [
  "function proposeIntent(bytes32 agentId,uint8 adapter,address target,uint256 maxValueWei,bytes32 calldataHash,string policyUri) returns (bytes32 intentId)",
  "function approveIntent(bytes32 intentId,string evidenceUri)",
  "function recordExecution(bytes32 intentId,bytes32 txHashOrReceiptHash,string evidenceUri)",
  "function cancelIntent(bytes32 intentId,string reason)",
  "function getOperatorIntents(address operator) view returns (bytes32[])",
  "function intents(bytes32 intentId) view returns (bytes32 intentId,bytes32 agentId,address operator,uint8 adapter,address target,uint256 maxValueWei,bytes32 calldataHash,string policyUri,string evidenceUri,uint8 status,uint256 createdAt,uint256 updatedAt)",
  "event ExecutionIntentProposed(bytes32 indexed intentId,bytes32 indexed agentId,address indexed operator,uint8 adapter,address target,uint256 maxValueWei,bytes32 calldataHash,string policyUri)",
] as const;

export const EXECUTION_ADAPTERS = {
  GMX: 0,
  ZeroDev: 1,
  Stylus: 2,
  Dune: 3,
  Fhenix: 4,
  RobinhoodChain: 5,
  Manual: 6,
} as const;

export const ORDER_STATUS = ["Pending", "Accepted", "Processing", "Fulfilled", "Settled", "Refunded", "Failed"] as const;

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function agentIdFromSlug(slug: string) {
  return id(slug.trim() || "agent");
}

export function hashText(value: string) {
  return keccak256(toUtf8Bytes(value.trim()));
}

export function toWei(value: string) {
  return parseEther(value || "0");
}

export function toUnits(value: string, decimals = 6) {
  const [whole, fraction = ""] = (value || "0").split(".");
  return BigInt(whole || "0") * (10n ** BigInt(decimals)) + BigInt((fraction.padEnd(decimals, "0").slice(0, decimals)) || "0");
}

export function fromUnits(value: bigint, decimals = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function fromWei(value: bigint) {
  return formatEther(value);
}

export function shortAddress(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "";
}

export function txUrl(hash: string) {
  return `${ARBITRUM_EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(address: string) {
  return `${ARBITRUM_EXPLORER_URL}/address/${address}`;
}

export function publicProvider() {
  return new JsonRpcProvider(ARBITRUM_RPC_URL, ARBITRUM_CHAIN_ID);
}

export async function riskOracleQuote() {
  const provider = publicProvider();
  const oracle = new Contract(CONTRACTS.ArbitrumAgentRiskOracle, RISK_ORACLE_ABI, provider);
  const platform = new Contract(ARBITRUM_AGENT_PLATFORM_ADDRESS, ARBITRUM_AGENT_PLATFORM_ABI, provider);
  const [requestDeposit, pricePerAgentWei, subcommitteeSize] = await Promise.all([
    (platform as any).getRequestDeposit() as Promise<bigint>,
    (oracle as any).pricePerAgentWei() as Promise<bigint>,
    (oracle as any).subcommitteeSize() as Promise<bigint>,
  ]);

  return {
    agentId: ARBITRUM_RISK_AGENT_ID,
    platform: ARBITRUM_AGENT_PLATFORM_ADDRESS,
    pricePerAgentWei,
    requestDeposit,
    subcommitteeSize,
    totalWei: requestDeposit + (pricePerAgentWei * subcommitteeSize),
  };
}

export async function switchToArbitrum() {
  if (!window.ethereum) throw new Error("Install an EVM wallet first.");
  try {
    await window.ethereum.request?.({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARBITRUM_CHAIN_ID_HEX }],
    });
  } catch {
    await window.ethereum.request?.({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: ARBITRUM_CHAIN_ID_HEX,
        chainName: "Arbitrum Sepolia",
        nativeCurrency: { name: "Arbitrum Sepolia Token", symbol: "ETH", decimals: 18 },
        rpcUrls: [ARBITRUM_RPC_URL],
        blockExplorerUrls: [ARBITRUM_EXPLORER_URL],
      }],
    });
  }
}

export async function signerProvider() {
  if (!window.ethereum) throw new Error("Install MetaMask, Rabby, or another EVM wallet.");
  await window.ethereum.request?.({ method: "eth_requestAccounts" });
  await switchToArbitrum();
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function connectedAddress() {
  const signer = await signerProvider();
  return signer.getAddress();
}

export async function balances(address: string) {
  const provider = publicProvider();
  return fromWei(await provider.getBalance(address));
}

export async function registryContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentRegistry, AGENT_REGISTRY_ABI, signer);
}

export async function policyContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.TreasuryPolicy, DEPTH_CONTRACTS_READY ? TREASURY_POLICY_ABI : LEGACY_TREASURY_POLICY_ABI, signer);
}

export async function orderBookContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentOrderBook, AGENT_ORDER_BOOK_ABI, signer);
}

export async function operatorControlsContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.OperatorControls, OPERATOR_CONTROLS_ABI, signer);
}

export async function riskOracleContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.ArbitrumAgentRiskOracle, RISK_ORACLE_ABI, signer);
}

export async function spendCardVaultContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentSpendCardVault, SPEND_CARD_VAULT_ABI, signer);
}

export async function erc20Contract(address = USDC_TOKEN_ADDRESS) {
  const signer = await signerProvider();
  return new Contract(address, ERC20_ABI, signer);
}

export async function privacyVaultContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.ArbitrumPrivacyVault, PRIVACY_VAULT_ABI, signer);
}

export async function invoiceBookContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentInvoiceBook, INVOICE_BOOK_ABI, signer);
}

export async function reputationBookContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentReputationBook, REPUTATION_BOOK_ABI, signer);
}

export async function agentIdentity8004Contract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.AgentIdentity8004, AGENT_IDENTITY_8004_ABI, signer);
}

export async function executionRouterContract() {
  const signer = await signerProvider();
  return new Contract(CONTRACTS.ArbitrumExecutionRouter, EXECUTION_ROUTER_ABI, signer);
}

export type LocalRecord = {
  id: string;
  type: string;
  title: string;
  status: string;
  amount?: string;
  txHash?: string;
  createdAt: string;
};

export function readRecords(): LocalRecord[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(window.localStorage.getItem("arcpay-arbitrum-records") ?? "[]") as LocalRecord[];
}

export async function fetchRecords(): Promise<LocalRecord[]> {
  if (typeof window === "undefined") return [];
  const local = readRecords();
  try {
    const response = await fetch("/api/records", { cache: "no-store" });
    if (!response.ok) return local;
    const rows = await response.json();
    const server = Array.isArray(rows) ? rows.map(normalizeRecord).filter(Boolean) as LocalRecord[] : [];
    return mergeRecords(local, server);
  } catch {
    return local;
  }
}

export function writeRecord(record: Omit<LocalRecord, "createdAt">) {
  const next = [{ ...record, createdAt: new Date().toISOString() }, ...readRecords()].slice(0, 100);
  window.localStorage.setItem("arcpay-arbitrum-records", JSON.stringify(next));
  fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  }).catch(() => undefined);
}

function normalizeRecord(row: any): LocalRecord | null {
  if (!row) return null;
  return {
    id: String(row.id ?? crypto.randomUUID()),
    type: String(row.type ?? "audit"),
    title: String(row.title ?? "Untitled"),
    status: String(row.status ?? "created"),
    amount: row.amount === null || row.amount === undefined ? undefined : String(row.amount),
    txHash: row.txHash ?? row.tx_hash ?? undefined,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  };
}

function mergeRecords(local: LocalRecord[], server: LocalRecord[]) {
  const seen = new Set<string>();
  return [...server, ...local]
    .filter((record) => {
      const key = record.txHash ? `${record.txHash}:${record.type}:${record.title}` : record.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 200);
}
