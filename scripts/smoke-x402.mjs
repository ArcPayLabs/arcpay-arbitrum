import { spawn } from "node:child_process";
import fs from "node:fs";
import { Contract, JsonRpcProvider, Wallet, formatEther, id, parseEther } from "ethers";

loadEnv();

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY missing. x402 smoke requires a funded Arbitrum provider signer.");
}

const port = Number(process.env.X402_SMOKE_PORT || 4412);
const baseUrl = `http://127.0.0.1:${port}`;
const adminSecret = `x402-smoke-${Date.now()}`;
const deployment = JSON.parse(fs.readFileSync("deployments/arbitrum-sepolia.json", "utf8"));
const provider = new JsonRpcProvider(process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc", 421614);
const providerWallet = new Wallet(process.env.PRIVATE_KEY, provider);
const requester = Wallet.createRandom().connect(provider);
const requesterFunding = parseEther(process.env.ARBITRUM_SMOKE_REQUESTER_FUNDING_ETH || "0.03");
const minimumProviderBalance = parseEther(process.env.ARBITRUM_SMOKE_MIN_PROVIDER_ETH || "0.08");
const c = deployment.contracts;

const registry = new Contract(c.AgentRegistry, [
  "function registerAgent(bytes32,string,string,string,uint256)",
  "function agents(bytes32) view returns (address,string,string,string,uint256,bool,uint256,uint256)",
], providerWallet);
const policy = new Contract(c.TreasuryPolicy, [
  "function setPolicy(uint256,uint256,uint256,uint256,uint8,uint8,bool,bool)",
  "function setAgentAllowed(bytes32,bool)",
], requester);
const orderBookRequester = new Contract(c.AgentOrderBook, [
  "function createOrder(bytes32,string) payable returns (bytes32)",
  "function settleOrder(bytes32)",
  "event OrderCreated(bytes32 indexed orderId,bytes32 indexed agentId,address indexed requester,address provider,uint256 amountWei,string requestUri)",
], requester);

const server = spawn(process.execPath, ["apps/x402-server/server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    X402_SERVER_PORT: String(port),
    X402_ADMIN_SECRET: adminSecret,
    X402_PROVIDER_PRIVATE_KEY: process.env.PRIVATE_KEY,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(`[x402] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[x402] ${chunk}`));

const results = [];
let slug;
let agentId;
let orderId;

try {
  await waitForHealth();

  await run("x402 health", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    if (!res.ok || body.service !== "arcpay-arbitrum-x402") throw new Error("bad health response");
    return `${body.network} chain ${body.chainId}`;
  });

  await run("provider has Arbitrum funds", async () => {
    const balance = await provider.getBalance(providerWallet.address);
    if (balance < minimumProviderBalance) throw new Error(`low ETH balance ${formatEther(balance)}`);
    return `${providerWallet.address.slice(0, 6)}...${providerWallet.address.slice(-4)} has ${formatEther(balance)} ETH`;
  });

  await run("register x402 agent", async () => {
    slug = `x402-agent-${Date.now()}`;
    agentId = id(slug);
    const endpoint = `${baseUrl}/agent/${slug}/work`;
    await wait(registry.registerAgent(agentId, "x402 Arbitrum Research Agent", endpoint, "x402,research,risk,treasury", parseEther("0.0001")));
    const row = await registry.agents(agentId);
    if (row[0].toLowerCase() !== providerWallet.address.toLowerCase() || !row[5]) throw new Error("agent not active");
    return slug;
  });

  await run("fund requester and set policy", async () => {
    await wait(providerWallet.sendTransaction({ to: requester.address, value: requesterFunding }));
    await wait(policy.setPolicy(parseEther("0.01"), parseEther("0.05"), parseEther("0.1"), 0, 0, 0, false, true));
    await wait(policy.setAgentAllowed(agentId, true));
    return `${requester.address.slice(0, 6)}...${requester.address.slice(-4)} funded and allowlisted`;
  });

  await run("protected resource returns HTTP 402", async () => {
    const res = await fetch(`${baseUrl}/agent/${slug}/work`);
    const body = await res.json();
    if (res.status !== 402) throw new Error(`expected 402, got ${res.status}`);
    if (res.headers.get("x402-version") !== "1") throw new Error("missing x402-version header");
    if (!res.headers.get("x402-payment-required")) throw new Error("missing encoded payment requirements header");
    if (body.accepts?.[0]?.action !== "createOrder(bytes32,string)") throw new Error("missing payment requirement");
    if (body.accepts?.[0]?.maxAmountRequired !== body.accepts?.[0]?.amountWei) throw new Error("missing x402 exact amount field");
    return `${body.accepts[0].amountStt} ETH quoted`;
  });

  await run("create on-chain x402 order", async () => {
    const requestUri = `${baseUrl}/agent/${slug}/work`;
    const tx = await orderBookRequester.createOrder(agentId, requestUri, { value: parseEther("0.0001") });
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((log) => {
        try {
          return orderBookRequester.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event?.name === "OrderCreated");
    orderId = parsed?.args?.orderId;
    if (!orderId) throw new Error("missing OrderCreated event");
    return `${orderId.slice(0, 10)}...`;
  });

  await run("verify paid but locked", async () => {
    const res = await fetch(`${baseUrl}/x402/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, agentSlug: slug, requester: requester.address }),
    });
    const body = await res.json();
    if (!body.paid || body.unlocked) throw new Error("expected paid locked order");
    return body.statusName;
  });

  await run("provider fulfills through x402 server", async () => {
    const res = await fetch(`${baseUrl}/agent/${slug}/provider/fulfill`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${adminSecret}` },
      body: JSON.stringify({ orderId, resultUri: `ipfs://arcpay-x402-result/${slug}` }),
    });
    const body = await res.json();
    if (!body.ok || body.statusName !== "Fulfilled") throw new Error(JSON.stringify(body));
    return `${body.statusName} with ${body.txs.length} txs`;
  });

  await run("fulfilled x402 order unlocks resource", async () => {
    const res = await fetch(`${baseUrl}/agent/${slug}/work?orderId=${orderId}`);
    const body = await res.json();
    if (!res.ok || !body.unlocked) throw new Error("resource did not unlock");
    return body.result.evidenceUri;
  });

  await run("x402 payment proof header unlocks resource", async () => {
    const res = await fetch(`${baseUrl}/agent/${slug}/work`, {
      headers: { "x-payment": JSON.stringify({ orderId }) },
    });
    const body = await res.json();
    if (!res.ok || !body.unlocked) throw new Error("header payment proof did not unlock");
    return body.arcpayScheme;
  });

  await run("requester settles after unlock", async () => {
    await wait(orderBookRequester.settleOrder(orderId));
    const res = await fetch(`${baseUrl}/x402/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, agentSlug: slug }),
    });
    const body = await res.json();
    if (!body.settled || !body.unlocked) throw new Error("settlement not verified");
    return body.statusName;
  });
} finally {
  server.kill();
}

if (results.some((row) => !row.ok)) process.exit(1);

async function run(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`PASS ${name} - ${detail}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error?.shortMessage || error?.message || String(error) });
    console.log(`FAIL ${name} - ${error?.shortMessage || error?.message || String(error)}`);
  }
}

async function wait(txPromise) {
  return (await txPromise).wait();
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("x402 server did not start");
}

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0 && !process.env[trimmed.slice(0, index)]) {
      process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
    }
  }
}
