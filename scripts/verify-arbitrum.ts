import { run } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type Deployment = {
  contracts: Record<string, string>;
  arbitrumAgentPlatform?: string;
  arbitrumRiskAgentId?: string;
};

const deploymentPath = path.join(process.cwd(), "deployments", "arbitrum-sepolia.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as Deployment;
const contracts = deployment.contracts;

const verifications: Array<{ name: string; args: unknown[] }> = [
  { name: "AgentRegistry", args: [] },
  { name: "TreasuryPolicy", args: [] },
  { name: "AgentTreasury", args: [] },
  {
    name: "AgentOrderBook",
    args: [contracts.AgentRegistry, contracts.TreasuryPolicy, contracts.AgentTreasury],
  },
  { name: "OperatorControls", args: [] },
  {
    name: "ArbitrumAgentRiskOracle",
    args: [
      deployment.arbitrumAgentPlatform ?? contracts.MockArbitrumAgentPlatform,
      deployment.arbitrumRiskAgentId ?? "13174292974160097713",
    ],
  },
  { name: "AgentSpendCardVault", args: [] },
  { name: "ArbitrumPrivacyVault", args: [] },
  { name: "AgentInvoiceBook", args: [] },
  { name: "AgentReputationBook", args: [contracts.AgentOrderBook] },
  { name: "AgentIdentity8004", args: [] },
  { name: "ArbitrumExecutionRouter", args: [] },
  { name: "MockUSDC", args: [] },
  { name: "MockArbitrumAgentPlatform", args: [] },
];

async function main() {
  if (!process.env.ARBISCAN_API_KEY && !process.env.ETHERSCAN_API_KEY) {
    throw new Error("Set ARBISCAN_API_KEY or ETHERSCAN_API_KEY before running contract verification.");
  }

  for (const item of verifications) {
    const address = contracts[item.name];
    if (!address) {
      console.warn(`Skipping ${item.name}: no address in ${deploymentPath}`);
      continue;
    }

    try {
      await verifyWithRetry(item.name, address, item.args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("already verified")) {
        console.log(`${item.name} already verified`);
        continue;
      }
      throw error;
    }

    await sleep(5000);
  }
}

async function verifyWithRetry(name: string, address: string, args: unknown[]) {
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(`Verifying ${name} at ${address}${attempt > 1 ? ` (retry ${attempt}/${attempts})` : ""}`);
      await run("verify:verify", {
        address,
        constructorArguments: args,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("already verified")) {
        console.log(`${name} already verified`);
        return;
      }

      const retryable =
        message.includes("Unexpected token '<'") ||
        message.includes("Connect Timeout") ||
        message.includes("network request failed") ||
        message.includes("UND_ERR_CONNECT_TIMEOUT");

      if (!retryable || attempt === attempts) {
        throw error;
      }

      const waitMs = 15000 * attempt;
      console.warn(`${name} explorer response was transient; retrying in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
