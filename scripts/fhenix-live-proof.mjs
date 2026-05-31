import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { Contract, ContractFactory, JsonRpcProvider, Wallet, formatEther, id } from "ethers";
import artifact from "../artifacts/contracts/ArbitrumFhenixPolicyVault.sol/ArbitrumFhenixPolicyVault.json" with { type: "json" };

dotenv.config();

const CHAIN_ID = 421614;
const RPC_URL = process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const EXPLORER = process.env.ARBITRUM_EXPLORER_URL || "https://sepolia.arbiscan.io";
const policyId = id(`arcpay-fhenix-policy-${Date.now()}`);
const metadataCommitment = id("ArcPay confidential policy: treasury-router spend <= limit");
const spendCents = Number(process.env.FHENIX_TEST_SPEND_CENTS || 125);
const limitCents = Number(process.env.FHENIX_TEST_LIMIT_CENTS || 500);

function json(value) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
}

async function main() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const beforeEth = await provider.getBalance(wallet.address);

  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  const deployment = await contract.waitForDeployment();
  const address = await deployment.getAddress();
  const deployTx = deployment.deploymentTransaction();
  const deployReceipt = deployTx ? await deployTx.wait() : null;

  const vault = new Contract(address, artifact.abi, wallet);
  const tx = await vault.recordPolicy(policyId, spendCents, limitCents, metadataCommitment, { gasLimit: 1_500_000 });
  const receipt = await tx.wait();
  const policy = await vault.getPolicy(policyId);
  const afterEth = await provider.getBalance(wallet.address);

  const proof = {
    ok: receipt?.status === 1,
    generatedAt: new Date().toISOString(),
    protocol: "arcpay-fhenix-cofhe-policy-proof",
    chain: "arbitrum-sepolia",
    chainId: CHAIN_ID,
    account: wallet.address,
    contract: address,
    docs: {
      cofheQuickStart: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start",
      fhenixArbitrum: "https://blog.arbitrum.io/fhenix-private-computation/",
    },
    action: "record_confidential_policy_handles",
    policyId,
    spendCents,
    limitCents,
    metadataCommitment,
    deployTxHash: deployTx?.hash ?? null,
    recordTxHash: tx.hash,
    explorerUrl: `${EXPLORER}/tx/${tx.hash}`,
    deployExplorerUrl: deployTx?.hash ? `${EXPLORER}/tx/${deployTx.hash}` : null,
    receipts: {
      deploy: deployReceipt ? {
        blockNumber: deployReceipt.blockNumber,
        gasUsed: deployReceipt.gasUsed.toString(),
        status: deployReceipt.status === 1 ? "success" : "failed",
      } : null,
      record: {
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        status: receipt?.status === 1 ? "success" : "failed",
      },
    },
    handles: {
      operator: policy.operator,
      spendHandle: policy.spendHandle,
      limitHandle: policy.limitHandle,
      allowedHandle: policy.allowedHandle,
      createdAt: policy.createdAt.toString(),
    },
    balances: {
      beforeEth: formatEther(beforeEth),
      afterEth: formatEther(afterEth),
    },
  };

  await mkdir("proofs", { recursive: true });
  await writeFile(path.join("proofs", "arbitrum-fhenix-live-proof.json"), `${json(proof)}\n`);
  await mkdir(path.join("apps", "frontend", "public", "proofs"), { recursive: true });
  await writeFile(path.join("apps", "frontend", "public", "proofs", "arbitrum-fhenix-live-proof.json"), `${json(proof)}\n`);

  console.log(json(proof));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
