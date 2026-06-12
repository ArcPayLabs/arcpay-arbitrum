#!/usr/bin/env node
import "dotenv/config";
import { id, keccak256, toUtf8Bytes } from "ethers";

const serverUrl = (process.env.ARCPAY_X402_SERVER_URL || "https://arcpay-arbitrum.vercel.app/api").replace(/\/+$/, "");
const appUrl = "https://arcpay-arbitrum.vercel.app";
const chainId = 421614;
const contracts = {
  registry: "0x5F5b8109c832BB6609178F0bb2e6A597387dA17E",
  orderBook: "0x3587fd962d40433165d5f2a3dFc60636ebD11e59",
  policy: "0x3F8bc2b46E7b71632CdADd1f00d4FD6BB11d8283",
  operatorControls: "0x0cbafFF48ac25178bd10D1cE851C04CCa4Fe387e",
  spendCardVault: "0x7C7304bC2D7bB39800eFE7Cdd9c79C7Afd04acF0",
  privacyVault: "0xCBa6Fa24a02F11fE0cd9F16B50e883fE1B4D40Eb",
  reputation: "0xDdbe6aD2652BD5d0Ab4D8a6D2ab8798Cf294D9dD",
  identity8004: "0xA6c4C9c5479553450F60663E5D8046f9E2CBF37D",
  executionRouter: "0x463152158F32aFeedCe58a6BbD19F8ECfA702d8e",
  usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
};
const [, , command = "help", arg1 = "research-agent", arg2 = "research-agent"] = process.argv;

async function main() {
  if (command === "quote") {
    const body = await getJson(`/x402/payment-requirements/${encodeURIComponent(arg1)}`);
    print(body);
  } else if (command === "locked") {
    const response = await fetch(`${serverUrl}/agent/${encodeURIComponent(arg1)}/work`);
    const body = await response.json();
    print({ status: response.status, body });
  } else if (command === "verify") {
    const body = await postJson("/x402/verify", { orderId: arg1, agentSlug: arg2 });
    print(body);
  } else if (command === "unlock") {
    const body = await getJson(`/agent/${encodeURIComponent(arg1)}/work?orderId=${encodeURIComponent(arg2)}`);
    print(body);
  } else if (command === "agent-id") {
    console.log(id(arg1));
  } else if (command === "onboard") {
    print(onboardPayload(arg1, arg2));
  } else if (command === "card") {
    print(cardPlan(arg1, arg2));
  } else if (command === "policy") {
    print(policyPlan(arg1, arg2));
  } else if (command === "evidence") {
    print(evidenceTemplate(arg1));
  } else {
    console.log([
      "ArcPay Arbitrum x402 Agent Starter",
      "",
      "Commands:",
      "  node src/agent-client.mjs quote <agentSlug>",
      "  node src/agent-client.mjs locked <agentSlug>",
      "  node src/agent-client.mjs verify <orderId> <agentSlug>",
      "  node src/agent-client.mjs unlock <agentSlug> <orderId>",
      "  node src/agent-client.mjs agent-id <agentSlug>",
      "  node src/agent-client.mjs onboard <agentSlug> <endpoint>",
      "  node src/agent-client.mjs card <agentSlug> <agentWallet>",
      "  node src/agent-client.mjs policy <agentSlug> <dailyLimit>",
      "  node src/agent-client.mjs evidence <agentSlug>",
    ].join("\n"));
  }
}

async function getJson(path) {
  const response = await fetch(`${serverUrl}${path}`);
  const body = await response.json();
  if (!response.ok && response.status !== 402) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function postJson(path, payload) {
  const response = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function onboardPayload(agentSlug, endpoint = `${serverUrl}/agent/${agentSlug}/work`) {
  return {
    protocol: "arcpay-arbitrum-agent-onboarding",
    chain: "arbitrum-sepolia",
    chainId,
    app: appUrl,
    x402Server: serverUrl,
    agentSlug,
    agentId: id(agentSlug),
    endpoint,
    contracts,
    nextSteps: [
      "Register the agent slug/capabilities in ArcPay or AgentRegistry.",
      "Optionally mint/register ERC-8004 identity for the agent.",
      "If external, create/redeem an OperatorControls claim code.",
      "Attach workspace policy and optional per-agent limits.",
      "Use quote -> create order -> verify -> fulfill -> unlock for x402 paid work.",
    ],
  };
}

function cardPlan(agentSlug, agentWallet = "<agent-wallet-address>") {
  const cardSlug = `${agentSlug}-usdc-card`;
  return {
    protocol: "arcpay-arbitrum-usdc-card",
    chainId,
    agentSlug,
    agentWallet,
    cardSlug,
    cardId: keccak256(toUtf8Bytes(cardSlug)),
    contracts: {
      spendCardVault: contracts.spendCardVault,
      usdc: contracts.usdc,
    },
    calls: [
      "approve USDC to AgentSpendCardVault",
      "createCard(cardId, agentWallet, USDC, limitBaseUnits, label)",
      "topUpCard(cardId, amountBaseUnits)",
      "setCardStatus(cardId, true) before spend",
      "agent calls spendCard(cardId, recipient, amountBaseUnits, memo)",
    ],
  };
}

function policyPlan(agentSlug, dailyLimit = "10") {
  return {
    protocol: "arcpay-arbitrum-policy-plan",
    agentSlug,
    agentId: id(agentSlug),
    workspacePolicy: ["treasury pause", "allowed token", "allowed network", "risk floor", "per-tx max", "daily max"],
    agentPolicy: {
      dailyLimit,
      allowedActions: ["x402", "order", "card-spend", "GMX intent", "ZeroDev sponsored action"],
      evidenceRequired: ["tx hash", "x402 verification", "order state", "GMX/ZeroDev/Dune/Fhenix evidence where applicable"],
    },
  };
}

function evidenceTemplate(agentSlug) {
  return {
    agentSlug,
    required: [
      "agent id and registration tx or claim-code redemption",
      "ERC-8004 identity record if used",
      "policy snapshot before action",
      "x402 quote response or order request",
      "Arbitrum Sepolia tx hash for every signed operation",
      "order/card/invoice/privacy state after execution",
      "GMX/ZeroDev/Dune/Fhenix evidence when used",
      "audit page record and Arbiscan URL",
    ],
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
