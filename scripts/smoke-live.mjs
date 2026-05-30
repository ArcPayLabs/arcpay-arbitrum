import fs from "node:fs";
import { Contract, JsonRpcProvider, Wallet, formatEther, id, keccak256, parseEther, toUtf8Bytes } from "ethers";

loadEnv();

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY missing. Funded Arbitrum smoke requires a testnet signer.");
}

const deployment = JSON.parse(fs.readFileSync("deployments/arbitrum-sepolia.json", "utf8"));
const provider = new JsonRpcProvider(process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc", 421614);
const deployer = new Wallet(process.env.PRIVATE_KEY, provider);
const requester = Wallet.createRandom().connect(provider);
const c = deployment.contracts;

const registry = new Contract(c.AgentRegistry, [
  "function registerAgent(bytes32,string,string,string,uint256)",
  "function agents(bytes32) view returns (address,string,string,string,uint256,bool,uint256,uint256)",
], deployer);
const policy = new Contract(c.TreasuryPolicy, [
  "function setPolicy(uint256,uint256,uint256,uint256,uint8,uint8,bool,bool)",
  "function setAgentAllowed(bytes32,bool)",
], requester);
const orderRequester = new Contract(c.AgentOrderBook, [
  "function createOrder(bytes32,string) payable returns (bytes32)",
  "function settleOrder(bytes32)",
  "event OrderCreated(bytes32 indexed orderId,bytes32 indexed agentId,address indexed requester,address provider,uint256 amountWei,string requestUri)",
], requester);
const orderProvider = new Contract(c.AgentOrderBook, [
  "function acceptOrder(bytes32)",
  "function markProcessing(bytes32)",
  "function fulfillOrder(bytes32,string)",
  "function orders(bytes32) view returns (bytes32,bytes32,address,address,uint256,string,string,uint8,uint256,uint256)",
], deployer);
const controls = new Contract(c.OperatorControls, [
  "function createClaimCode(bytes32,bytes32,string,uint256)",
  "function redeemClaimCode(string) returns (bytes32,bytes32)",
  "function recordWebhookFailure(bytes32)",
  "function recordWebhookSuccess(bytes32)",
  "function isWebhookOpen(bytes32) view returns (bool)",
], deployer);
const controlsRequester = controls.connect(requester);
const cards = new Contract(c.AgentSpendCardVault, [
  "function createCard(bytes32,address,address,uint256,string)",
  "function topUpCard(bytes32,uint256)",
  "function spendCard(bytes32,address,uint256,string)",
  "function cards(bytes32) view returns (address,address,address,uint256,uint256,uint256,bool,string,uint256)",
], deployer);
const usdc = new Contract(deployment.usdcToken, [
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
], deployer);
const privacy = new Contract(c.ArbitrumPrivacyVault, [
  "function createNativeIntent(bytes32,string) payable",
  "function createTokenIntent(bytes32,address,uint256,string)",
  "function releaseIntent(bytes32,bytes32,address)",
  "function intents(bytes32) view returns (address,address,uint256,string,bool,bool,uint256)",
], deployer);
const invoiceIssuer = c.AgentInvoiceBook ? new Contract(c.AgentInvoiceBook, [
  "function createInvoice(bytes32,address,address,uint256,string)",
  "function invoices(bytes32) view returns (bytes32,address,address,address,uint256,string,uint8,uint256,uint256,uint256)",
], deployer) : null;
const invoicePayer = c.AgentInvoiceBook ? new Contract(c.AgentInvoiceBook, [
  "function payNativeInvoice(bytes32) payable",
  "function invoices(bytes32) view returns (bytes32,address,address,address,uint256,string,uint8,uint256,uint256,uint256)",
], requester) : null;
const oracle = new Contract(c.ArbitrumAgentRiskOracle, [
  "function setAgentBudget(uint256,uint256)",
  "function requestRisk(bytes32,string) payable returns (uint256)",
  "function ownerFulfillForDemo(uint256,uint256,string,string)",
  "function results(uint256) view returns (uint256,bytes32,address,uint256,string,string,bool,uint8,uint256,uint256)",
  "event RiskRequested(uint256 indexed requestId,bytes32 indexed orderId,address indexed requester,string prompt)",
], deployer);
const platform = new Contract(deployment.arbitrumAgentPlatform, ["function getRequestDeposit() view returns (uint256)"], provider);
const reputation = c.AgentReputationBook ? new Contract(c.AgentReputationBook, [
  "function recordReview(bytes32,bytes32,uint8,bool,string) returns (bytes32)",
  "function reputationScore(bytes32) view returns (uint256)",
  "function reputations(bytes32) view returns (uint256,uint256,uint256,uint256,uint256)",
], requester) : null;

const results = [];
let agentId;
let orderId;

await run("Signer and Arbitrum funds", async () => {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 421614) throw new Error(`wrong chain ${network.chainId}`);
  const balance = await provider.getBalance(deployer.address);
  if (balance < parseEther("1")) throw new Error(`low ETH balance ${formatEther(balance)}`);
  return `${deployer.address.slice(0, 6)}...${deployer.address.slice(-4)} has ${formatEther(balance)} ETH`;
});

await run("Fund requester wallet", async () => {
  await wait(deployer.sendTransaction({ to: requester.address, value: parseEther("1") }));
  return `${requester.address.slice(0, 6)}...${requester.address.slice(-4)}`;
});

await run("Agent registry write", async () => {
  const slug = `smoke-agent-${Date.now()}`;
  agentId = id(slug);
  await wait(registry.registerAgent(agentId, "Smoke Research Agent", "https://agent.arcpay.test/mcp", "research,risk,treasury", parseEther("0.0001")));
  const row = await registry.agents(agentId);
  if (row[0].toLowerCase() !== deployer.address.toLowerCase() || !row[5]) throw new Error("agent not active after register");
  return slug;
});

await run("Treasury policy write", async () => {
  await wait(policy.setPolicy(parseEther("0.01"), parseEther("0.05"), parseEther("0.1"), parseEther("0.001"), 0, 0, false, true));
  await wait(policy.setAgentAllowed(agentId, true));
  return "limits + allowlist set for requester";
});

await run("Order escrow lifecycle", async () => {
  const tx = await orderRequester.createOrder(agentId, "ipfs://arcpay-smoke-request", { value: parseEther("0.0001") });
  const receipt = await tx.wait();
  const parsed = receipt.logs
    .map((log) => {
      try {
        return orderRequester.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === "OrderCreated");
  orderId = parsed?.args?.orderId;
  if (!orderId) throw new Error("missing OrderCreated event");
  await wait(orderProvider.acceptOrder(orderId));
  await wait(orderProvider.markProcessing(orderId));
  await wait(orderProvider.fulfillOrder(orderId, "ipfs://arcpay-smoke-result"));
  await wait(orderRequester.settleOrder(orderId));
  const row = await orderProvider.orders(orderId);
  if (Number(row[7]) !== 4) throw new Error(`unexpected order status ${row[7]}`);
  return `${orderId.slice(0, 10)}... settled`;
});

await run("Agent reputation book", async () => {
  if (!reputation) return "SKIP AgentReputationBook not deployed";
  await wait(reputation.recordReview(orderId, agentId, 91, false, "ipfs://arcpay-smoke-reputation"));
  const score = await reputation.reputationScore(agentId);
  const row = await reputation.reputations(agentId);
  if (score !== 91n || row[0] < 1n) throw new Error("reputation not recorded");
  return `score ${score.toString()} recorded`;
});

await run("Operator controls", async () => {
  const code = `claim-${Date.now()}`;
  await wait(controls.createClaimCode(keccak256(toUtf8Bytes(code)), agentId, "ipfs://claim-smoke", 3600));
  await wait(controlsRequester.redeemClaimCode(code));
  const originHash = id(`https://smoke-${Date.now()}.agent/webhook`);
  for (let i = 0; i < 5; i += 1) await wait(controls.recordWebhookFailure(originHash));
  if (!await controls.isWebhookOpen(originHash)) throw new Error("circuit did not open");
  await wait(controls.recordWebhookSuccess(originHash));
  return "claim redeem + webhook circuit breaker";
});

await run("USDC spend card", async () => {
  const decimals = Number(await usdc.decimals().catch(() => 6));
  const amount = 10n ** BigInt(Math.min(decimals, 6));
  const balance = await usdc.balanceOf(deployer.address);
  if (balance < amount) return `SKIP balance too low: ${balance.toString()} base units`;
  const cardId = id(`card-${Date.now()}`);
  await wait(cards.createCard(cardId, deployer.address, deployment.usdcToken, amount, "Smoke USDC Card"));
  await wait(usdc.approve(c.AgentSpendCardVault, amount));
  await wait(cards.topUpCard(cardId, amount));
  await wait(cards.spendCard(cardId, deployer.address, 1n, "smoke spend"));
  return `${await usdc.symbol().catch(() => "USDC")} card funded and spent`;
});

await run("Privacy vault release", async () => {
  const commitment = id(`native-privacy-${Date.now()}`);
  const nullifier = id(`release-${Date.now()}`);
  await wait(privacy.createNativeIntent(commitment, "encrypted://arcpay-smoke", { value: parseEther("0.00001") }));
  await wait(privacy.releaseIntent(commitment, nullifier, requester.address));
  const intent = await privacy.intents(commitment);
  if (!intent[4]) throw new Error("intent not released");
  return `${commitment.slice(0, 10)}... released`;
});

await run("USDC privacy vault release", async () => {
  const decimals = Number(await usdc.decimals().catch(() => 6));
  const amount = 1n;
  const balance = await usdc.balanceOf(deployer.address);
  if (balance < amount) return `SKIP balance too low: ${balance.toString()} base units`;
  const commitment = id(`usdc-privacy-${Date.now()}`);
  const nullifier = id(`usdc-release-${Date.now()}`);
  await wait(usdc.approve(c.ArbitrumPrivacyVault, amount));
  await wait(privacy.createTokenIntent(commitment, deployment.usdcToken, amount, "encrypted://arcpay-usdc-smoke"));
  await wait(privacy.releaseIntent(commitment, nullifier, requester.address));
  const intent = await privacy.intents(commitment);
  if (!intent[4]) throw new Error("USDC intent not released");
  return `${amount.toString()} base units released (${decimals} decimals)`;
});

await run("On-chain invoice settlement", async () => {
  if (!invoiceIssuer || !invoicePayer) return "SKIP AgentInvoiceBook not deployed";
  const invoiceId = id(`invoice-${Date.now()}`);
  const amount = parseEther("0.0001");
  await wait(invoiceIssuer.createInvoice(invoiceId, requester.address, "0x0000000000000000000000000000000000000000", amount, "arcpay://invoice/smoke"));
  await wait(invoicePayer.payNativeInvoice(invoiceId, { value: amount }));
  const row = await invoiceIssuer.invoices(invoiceId);
  if (Number(row[6]) !== 1) throw new Error(`invoice not paid: status ${row[6]}`);
  return `${invoiceId.slice(0, 10)}... paid`;
});

await run("Arbitrum agent risk oracle", async () => {
  await wait(oracle.setAgentBudget(0, 1));
  const deposit = await platform.getRequestDeposit();
  const tx = await oracle.requestRisk(id(`risk-order-${Date.now()}`), "Score this smoke-test counterparty", { value: deposit });
  const receipt = await tx.wait();
  const parsed = receipt.logs
    .map((log) => {
      try {
        return oracle.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === "RiskRequested");
  const requestId = parsed?.args?.requestId;
  if (requestId === undefined) throw new Error("missing RiskRequested event");
  await wait(oracle.ownerFulfillForDemo(requestId, 88, "APPROVE", "ipfs://smoke-risk-evidence"));
  const result = await oracle.results(requestId);
  if (!result[6] || result[4] !== "APPROVE") throw new Error("risk result not fulfilled");
  return `request ${requestId.toString()} approved`;
});

if (results.some((row) => !row.ok)) process.exit(1);

async function run(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`${String(detail).startsWith("SKIP") ? "SKIP" : "PASS"} ${name} - ${detail}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error?.shortMessage || error?.message || String(error) });
    console.log(`FAIL ${name} - ${error?.shortMessage || error?.message || String(error)}`);
  }
}

async function wait(txPromise) {
  return (await txPromise).wait();
}

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
}
