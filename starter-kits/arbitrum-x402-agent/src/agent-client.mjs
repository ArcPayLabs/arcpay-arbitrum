#!/usr/bin/env node
import "dotenv/config";
import { id } from "ethers";

const serverUrl = (process.env.ARCPAY_X402_SERVER_URL || "https://arcpay-arbitrum.vercel.app/api").replace(/\/+$/, "");
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

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
