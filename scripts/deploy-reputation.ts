import { ethers } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deploymentPath = path.join("deployments", "arbitrum-sepolia.json");
  const existing = fs.existsSync(deploymentPath)
    ? JSON.parse(fs.readFileSync(deploymentPath, "utf8"))
    : { network: "arbitrum-sepolia", contracts: {} };

  const orderBook = existing.contracts?.AgentOrderBook;
  if (!orderBook) throw new Error("AgentOrderBook missing from deployment file");

  console.log(`Deploying AgentReputationBook from ${deployer.address}`);
  const reputation = await ethers.deployContract("AgentReputationBook", [orderBook]);
  await reputation.waitForDeployment();
  const address = await reputation.getAddress();

  const next = {
    ...existing,
    network: existing.network ?? "arbitrum-sepolia",
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: existing.deployer ?? deployer.address,
    updatedAt: new Date().toISOString(),
    contracts: {
      ...existing.contracts,
      AgentReputationBook: address,
    },
  };

  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`AgentReputationBook: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
