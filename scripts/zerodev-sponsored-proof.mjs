import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk";
import { KERNEL_V3_1, getEntryPoint } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const proofsDir = path.join(root, "proofs");
const proofPath = path.join(proofsDir, "arbitrum-zerodev-sponsored-userop.json");
const deployment = JSON.parse(fs.readFileSync(path.join(root, "deployments", "arbitrum-sepolia.json"), "utf8"));

const chain = {
  id: Number(process.env.ARBITRUM_CHAIN_ID || deployment.chainId || 421614),
  name: "Arbitrum Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"] },
  },
  blockExplorers: {
    default: { name: "Arbiscan", url: process.env.ARBITRUM_EXPLORER_URL || "https://sepolia.arbiscan.io" },
  },
};

const registryAbi = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "name", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "capabilities", type: "string" },
      { name: "priceWei", type: "uint256" },
    ],
    outputs: [],
  },
];

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));

const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY || process.env.X402_PROVIDER_PRIVATE_KEY);
const zerodevRpc = process.env.ZERODEV_RPC_URL;

if (!privateKey) fail("PRIVATE_KEY or X402_PROVIDER_PRIVATE_KEY is required.");
if (!zerodevRpc) fail("ZERODEV_RPC_URL is required.");

const publicClient = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });
const signer = privateKeyToAccount(privateKey);
const entryPoint = getEntryPoint("0.7");
const kernelVersion = KERNEL_V3_1;
const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer,
  entryPoint,
  kernelVersion,
});
const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
  entryPoint,
  kernelVersion,
});

const smartAccount = account.address;
if (args["print-account"]) {
  console.log(JSON.stringify({ ok: true, eoa: signer.address, smartAccount, chainId: chain.id }, null, 2));
  process.exit(0);
}

const paymasterClient = createZeroDevPaymasterClient({
  chain,
  transport: http(zerodevRpc),
});

const kernelClient = createKernelAccountClient({
  account,
  chain,
  client: publicClient,
  bundlerTransport: http(zerodevRpc),
  paymaster: {
    async getPaymasterData(userOperation) {
      return paymasterClient.sponsorUserOperation({ userOperation });
    },
  },
});

const slug = String(args.slug || `zerodev-proof-${Date.now()}`);
const agentId = keccak256(toHex(slug));
const endpoint = String(args.endpoint || `https://arcpay-arbitrum.vercel.app/api/agent/${encodeURIComponent(slug)}/work`);
const capabilities = JSON.stringify({
  source: "zerodev-sponsored-userop",
  adapter: "ZeroDev",
  chain: "arbitrum-sepolia",
  evidence: "gas-sponsored smart account call into ArcPay AgentRegistry",
});
const callData = encodeFunctionData({
  abi: registryAbi,
  functionName: "registerAgent",
  args: [agentId, "ArcPay ZeroDev Sponsored Agent", endpoint, capabilities, parseEther("0.00001")],
});

console.log(JSON.stringify({
  ok: true,
  phase: "prepared",
  eoa: signer.address,
  smartAccount,
  target: deployment.contracts.AgentRegistry,
  slug,
  agentId,
  valueEth: "0",
}, null, 2));

const userOpHash = await kernelClient.sendTransaction({
  to: deployment.contracts.AgentRegistry,
  value: 0n,
  data: callData,
});

console.log(JSON.stringify({ ok: true, phase: "submitted", userOpHash }, null, 2));

const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
const txHash = receipt.receipt?.transactionHash || receipt.transactionHash;
const balance = await publicClient.getBalance({ address: smartAccount });

const proof = {
  ok: true,
  generatedAt: new Date().toISOString(),
  chain: "arbitrum-sepolia",
  chainId: chain.id,
  eoa: signer.address,
  smartAccount,
  userOpHash,
  txHash,
  explorerUrl: txHash ? `${chain.blockExplorers.default.url}/tx/${txHash}` : null,
  target: deployment.contracts.AgentRegistry,
  action: "AgentRegistry.registerAgent",
  slug,
  agentId,
  endpoint,
  smartAccountBalanceEth: formatEther(balance),
  zerodev: {
    projectId: mask(process.env.ZERO_DEV_PROJECT_ID),
    rpcConfigured: Boolean(process.env.ZERODEV_RPC_URL),
    apiKeyConfigured: Boolean(process.env.ZERODEV_API_KEY),
  },
};

fs.mkdirSync(proofsDir, { recursive: true });
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, phase: "confirmed", proofPath, txHash }, null, 2));

function normalizePrivateKey(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("0x") ? text : `0x${text}`;
}

function mask(value) {
  const text = String(value || "");
  return text.length > 10 ? `${text.slice(0, 6)}...${text.slice(-4)}` : null;
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}
