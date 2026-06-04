import { Contract, Interface, JsonRpcProvider, Wallet, formatEther, id } from "ethers";
import deployment from "../../deployment/arbitrum-sepolia.json";
import { trackUsageEvent } from "./usage";

const ZERO = "0x0000000000000000000000000000000000000000";
const STATUS = ["Pending", "Accepted", "Processing", "Fulfilled", "Settled", "Refunded", "Failed"];
const X402_PROTOCOL_VERSION = "1";
const ARCPAY_X402_SCHEME = "arcpay-arbitrum-escrow-v1";

const registryAbi = [
  "function agents(bytes32) view returns (address owner,string name,string endpoint,string capabilities,uint256 priceWei,bool active,uint256 createdAt,uint256 updatedAt)",
] as const;

const orderBookAbi = [
  "function acceptOrder(bytes32 orderId)",
  "function markProcessing(bytes32 orderId)",
  "function fulfillOrder(bytes32 orderId,string resultUri)",
  "function orders(bytes32) view returns (bytes32 orderId,bytes32 agentId,address requester,address provider,uint256 amountWei,string requestUri,string resultUri,uint8 status,uint256 createdAt,uint256 updatedAt)",
] as const;

const orderBookInterface = new Interface([
  "function createOrder(bytes32 agentId,string requestUri)",
]);

type Deployment = typeof deployment;

export function x402Health() {
  return {
    ok: true,
    service: "arcpay-arbitrum-x402",
    runtime: "vercel-next-api",
    network: deployment.network,
    chainId: deployment.chainId,
    orderBook: deployment.contracts.AgentOrderBook,
    registry: deployment.contracts.AgentRegistry,
  };
}

export function x402Demo() {
  return {
    ok: true,
    protocol: "x402",
    arcpayScheme: ARCPAY_X402_SCHEME,
    chain: deployment.network,
    chainId: deployment.chainId,
    protectedResource: `${appBaseUrl()}/api/agent/treasury-router/work`,
    paymentRequirements: `${appBaseUrl()}/api/x402/payment-requirements/treasury-router`,
    verify: `${appBaseUrl()}/api/x402/verify`,
    orderBook: deployment.contracts.AgentOrderBook,
  };
}

export async function paymentRequirements(slug: string, request: Request) {
  const agentId = id(slug);
  const agent = await (registry() as any).agents(agentId);
  if (agent.owner === ZERO) {
    throw httpError(404, `agent not registered: ${slug}`);
  }

  const requestUri = `${originFor(request)}/api/agent/${encodeURIComponent(slug)}/work`;
  const calldata = orderBookInterface.encodeFunctionData("createOrder", [agentId, requestUri]);
  const requirements = {
    ok: true,
    x402Version: X402_PROTOCOL_VERSION,
    arcpayScheme: ARCPAY_X402_SCHEME,
    protocol: "x402",
    status: 402,
    reason: "payment_required",
    network: deployment.network,
    caip2Network: caip2Network(deployment),
    chainId: deployment.chainId,
    currency: "ETH",
    asset: "native",
    resource: requestUri,
    agent: {
      slug,
      agentId,
      owner: agent.owner,
      name: agent.name,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      active: agent.active,
    },
    accepts: [{
      scheme: "exact",
      network: caip2Network(deployment),
      chainId: deployment.chainId,
      asset: "native",
      currency: "ETH",
      maxAmountRequired: agent.priceWei.toString(),
      amountWei: agent.priceWei.toString(),
      amountEth: formatEther(agent.priceWei),
      payTo: deployment.contracts.AgentOrderBook,
      recipient: deployment.contracts.AgentOrderBook,
      description: `Pay ${agent.name || slug} for protected Arbitrum agent work.`,
      resource: requestUri,
      mimeType: "application/json",
      contract: "AgentOrderBook",
      action: "createOrder(bytes32,string)",
      calldata,
      args: { agentId, requestUri },
      verificationUrl: `${originFor(request)}/api/x402/verify`,
      unlockUrl: `${originFor(request)}/api/agent/${encodeURIComponent(slug)}/work?orderId={orderId}`,
      paymentProof: {
        type: "arbitrum-order-id",
        header: "X-Payment",
        acceptedFormats: ["raw orderId", "{\"orderId\":\"0x...\"}", "base64url JSON"],
      },
    }],
    instructions: [
      "Call AgentOrderBook.createOrder(agentId, requestUri) with msg.value equal to amountWei.",
      "Send the resulting orderId to /api/x402/verify or append ?orderId=... to the protected resource.",
      "The resource unlocks only after the provider fulfills or the requester settles the on-chain order.",
    ],
  };

  void trackUsageEvent({
    eventType: "x402_quote_created",
    agentId,
    agentSlug: slug,
    source: "vercel-x402",
    path: new URL(request.url).pathname,
    status: "payment_required",
    metadata: { amountWei: requirements.accepts[0]?.amountWei, currency: "ETH" },
  });

  return requirements;
}

export async function verifyOrder(input: { orderId?: string | null; slug?: string | null; requester?: string | null }) {
  const { orderId, slug, requester } = input;
  if (!orderId || typeof orderId !== "string") {
    return { ok: false, paid: false, unlocked: false, error: "orderId required" };
  }

  const order = await (orderBook() as any).orders(orderId);
  if (order.requester === ZERO) {
    return { ok: true, paid: false, unlocked: false, orderId, statusName: "Missing" };
  }

  const expectedAgentId = slug ? id(slug) : null;
  const agentMatches = !expectedAgentId || order.agentId.toLowerCase() === expectedAgentId.toLowerCase();
  const requesterMatches = !requester || order.requester.toLowerCase() === requester.toLowerCase();
  const status = Number(order.status);
  const paid = status >= 0 && status <= 4;
  const unlocked = agentMatches && requesterMatches && (status === 3 || status === 4);

  const result = {
    ok: true,
    paid,
    unlocked,
    orderId,
    agentId: order.agentId,
    requester: order.requester,
    provider: order.provider,
    amountWei: order.amountWei.toString(),
    amountEth: formatEther(order.amountWei),
    requestUri: order.requestUri,
    resultUri: order.resultUri,
    status,
    statusName: STATUS[status] || `Unknown(${status})`,
    agentMatches,
    requesterMatches,
    settled: status === 4,
  };

  void trackUsageEvent({
    eventType: "x402_order_verified",
    owner: result.requester,
    agentId: result.agentId,
    agentSlug: slug,
    source: "vercel-x402",
    status: result.unlocked ? "unlocked" : result.statusName,
    metadata: { orderId: result.orderId, paid: result.paid, settled: result.settled },
  });

  return result;
}

export async function protectedWork(slug: string, request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || paymentProofOrderId(request);
  if (!orderId) {
    const requirements = await paymentRequirements(slug, request);
    return paymentRequired(requirements, { reason: "missing_order_id" });
  }

  const verification = await verifyOrder({ orderId, slug });
  if (!verification.unlocked) {
    const requirements = await paymentRequirements(slug, request);
    return paymentRequired(requirements, { reason: "order_not_fulfilled", verification });
  }
  const unlockedVerification = verification as any;

  void trackUsageEvent({
    eventType: "x402_resource_unlocked",
    owner: unlockedVerification.requester,
    agentId: unlockedVerification.agentId,
    agentSlug: slug,
    source: "vercel-x402",
    path: url.pathname,
    status: unlockedVerification.statusName,
    metadata: { orderId, resultUri: unlockedVerification.resultUri },
  });

  return json({
    ok: true,
    unlocked: true,
    x402Version: X402_PROTOCOL_VERSION,
    arcpayScheme: ARCPAY_X402_SCHEME,
    orderId,
    agentSlug: slug,
    result: {
      summary: `Paid Arbitrum x402 work unlocked for ${slug}.`,
      evidenceUri: unlockedVerification.resultUri,
      generatedAt: new Date().toISOString(),
      nextAction: "Settle the order from the requester wallet if it is not already settled.",
    },
    verification,
  }, {
    headers: {
      "payment-response": JSON.stringify({ ok: true, orderId, unlocked: true, scheme: ARCPAY_X402_SCHEME }),
      "x-payment-response": JSON.stringify({ ok: true, orderId, unlocked: true, scheme: ARCPAY_X402_SCHEME }),
      "PAYMENT-RESPONSE": JSON.stringify({ ok: true, orderId, unlocked: true, scheme: ARCPAY_X402_SCHEME }),
      "X-PAYMENT-RESPONSE": JSON.stringify({ ok: true, orderId, unlocked: true, scheme: ARCPAY_X402_SCHEME }),
    },
  });
}

export async function providerFulfill(slug: string, request: Request) {
  const secret = process.env.X402_ADMIN_SECRET || "";
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ ok: false, error: "invalid x402 provider authorization" }, { status: 401 });
  }

  const signer = providerSigner();
  if (!signer) {
    return json({ ok: false, error: "X402_PROVIDER_PRIVATE_KEY or PRIVATE_KEY is required for provider fulfillment." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) return json({ ok: false, error: "orderId required" }, { status: 400 });

  const contract = new Contract(deployment.contracts.AgentOrderBook, orderBookAbi, signer);
  const order = await (contract as any).orders(orderId);
  const status = Number(order.status);
  const txs: string[] = [];

  if (order.requester === ZERO) return json({ ok: false, error: "order missing", orderId }, { status: 404 });
  if (status === 0) txs.push(await waitHash((contract as any).acceptOrder(orderId)));
  if (status <= 1) txs.push(await waitHash((contract as any).markProcessing(orderId)));
  if (status <= 2) {
    txs.push(await waitHash((contract as any).fulfillOrder(orderId, body.resultUri || `x402://arcpay-arbitrum/${slug}/${orderId}`)));
  }

  const verified = await verifyOrder({ orderId, slug });
  void trackUsageEvent({
    eventType: "x402_provider_fulfilled",
    agentSlug: slug,
    source: "vercel-x402",
    status: verified.statusName || "fulfilled",
    metadata: { orderId, txs },
  });

  return json({ ok: true, orderId, txs, verification: verified });
}

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: { ...corsHeaders(), ...(init.headers || {}) } });
}

function paymentRequired(requirements: unknown, extra: Record<string, unknown>) {
  return json({ ...requirements as Record<string, unknown>, ...extra }, {
    status: 402,
    headers: {
      "x402-version": X402_PROTOCOL_VERSION,
      "x402-payment-required": "true",
      "payment-required": "true",
      "PAYMENT-REQUIRED": "true",
      "x-accept-payment": JSON.stringify((requirements as { accepts?: unknown }).accepts || []),
      "X-ACCEPT-PAYMENT": JSON.stringify((requirements as { accepts?: unknown }).accepts || []),
    },
  });
}

export function corsHeaders() {
  return {
    "access-control-allow-origin": process.env.X402_ALLOWED_ORIGIN || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-arcpay-order-id,x-payment,payment,X-PAYMENT,PAYMENT",
    "access-control-expose-headers": "x-accept-payment,X-ACCEPT-PAYMENT,x402-version,x402-payment-required,payment-required,PAYMENT-REQUIRED,payment-response,x-payment-response,PAYMENT-RESPONSE,X-PAYMENT-RESPONSE",
  };
}

export function options() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function providerRpc() {
  return new JsonRpcProvider(process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc", 421614);
}

function registry() {
  return new Contract(deployment.contracts.AgentRegistry, registryAbi, providerRpc());
}

function orderBook() {
  return new Contract(deployment.contracts.AgentOrderBook, orderBookAbi, providerRpc());
}

function providerSigner() {
  const key = process.env.X402_PROVIDER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
  return key ? new Wallet(key, providerRpc()) : null;
}

async function waitHash(txPromise: Promise<{ wait: () => Promise<{ hash: string }> }>) {
  return (await (await txPromise).wait()).hash;
}

function paymentProofOrderId(request: Request) {
  const direct = request.headers.get("x-arcpay-order-id");
  if (direct?.trim()) return direct.trim();

  const proof = request.headers.get("x-payment") || request.headers.get("payment");
  if (!proof?.trim()) return null;
  const trimmed = proof.trim();
  if (trimmed.startsWith("0x")) return trimmed;

  const parsed = parsePaymentProof(trimmed);
  return typeof parsed?.orderId === "string" && parsed.orderId.trim() ? parsed.orderId.trim() : null;
}

function parsePaymentProof(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    } catch {
      return null;
    }
  }
}

function caip2Network(value: Deployment) {
  return `eip155:${value.chainId}`;
}

function originFor(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://arcpay-arbitrum.vercel.app";
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
