import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import { Contract, JsonRpcProvider, Wallet, formatEther, formatUnits, parseEther } from "ethers";

const require = createRequire(import.meta.url);
const { GmxApiSdk } = require("@gmx-io/sdk/v2");

dotenv.config();

const CHAIN_ID = 421614;
const RPC_URL = process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const WETH = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73";
const USDC_SG = "0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773";
const ROUTER = "0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2";
const SYMBOL = "ETH/USD [WETH-USDC.SG]";
const SWAP_AMOUNT = parseEther(process.env.GMX_TEST_WETH_AMOUNT || "0.001");
const WETH_ABI = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
];

function json(value) {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item, 2);
}

async function main() {
  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const account = await wallet.getAddress();
  const sdk = new GmxApiSdk({ chainId: CHAIN_ID });
  const weth = new Contract(WETH, WETH_ABI, wallet);
  const usdc = new Contract(USDC_SG, ERC20_ABI, provider);

  const before = {
    eth: await provider.getBalance(account),
    weth: await weth.balanceOf(account),
    usdcSg: await usdc.balanceOf(account),
    allowance: await weth.allowance(account, ROUTER),
  };

  const txs = [];
  if (before.weth < SWAP_AMOUNT) {
    const wrapAmount = SWAP_AMOUNT - before.weth;
    const tx = await weth.deposit({ value: wrapAmount });
    const receipt = await tx.wait();
    txs.push({ action: "wrap_eth_to_weth", txHash: tx.hash, status: receipt?.status === 1 ? "success" : "failed" });
  }

  const allowanceAfterWrap = await weth.allowance(account, ROUTER);
  if (allowanceAfterWrap < SWAP_AMOUNT) {
    const tx = await weth.approve(ROUTER, SWAP_AMOUNT);
    const receipt = await tx.wait();
    txs.push({ action: "approve_weth_to_gmx_router", txHash: tx.hash, status: receipt?.status === 1 ? "success" : "failed" });
  }

  const prepared = await sdk.prepareOrder({
    kind: "swap",
    symbol: SYMBOL,
    orderType: "market",
    size: SWAP_AMOUNT,
    collateralToPay: { amount: SWAP_AMOUNT, token: "WETH" },
    receiveToken: "USDC.SG",
    mode: "classic",
    from: account,
    slippage: 100,
    executionFeeBufferBps: 5000,
  });

  if (prepared.payloadType !== "transaction") {
    throw new Error(`Expected classic GMX transaction payload, received ${prepared.payloadType}`);
  }

  const createOrderTx = await wallet.sendTransaction({
    to: prepared.payload.to,
    data: prepared.payload.data,
    value: BigInt(prepared.payload.value ?? 0),
    // GMX API currently estimates this route close to the hard limit on Arbitrum Sepolia.
    // Give the classic wallet path enough headroom so valid multicalls do not revert OOG.
    gasLimit: BigInt(process.env.GMX_CLASSIC_GAS_LIMIT || "2500000"),
  });
  const createOrderReceipt = await createOrderTx.wait();
  const submitted = {
    requestId: prepared.requestId,
    status: createOrderReceipt?.status === 1 ? "created" : "failed",
    txHash: createOrderTx.hash,
    mode: "classic",
  };

  let status = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 5000 : 10000));
    status = await sdk.fetchOrderStatus({ requestId: submitted.requestId });
    if (status?.txHash || status?.createdTxnHash || status?.executionTxnHash || ["executed", "failed", "cancelled", "expired"].includes(String(status?.status).toLowerCase())) {
      break;
    }
  }

  const after = {
    eth: await provider.getBalance(account),
    weth: await weth.balanceOf(account),
    usdcSg: await usdc.balanceOf(account),
    allowance: await weth.allowance(account, ROUTER),
  };

  const txHash = status?.executionTxnHash || status?.createdTxnHash || status?.txHash || submitted.txHash || null;
  const proof = {
    ok: Boolean(submitted.requestId),
    generatedAt: new Date().toISOString(),
    chain: "arbitrum-sepolia",
    chainId: CHAIN_ID,
    account,
    protocol: "gmx-v2-api-sdk",
    action: "classic_market_swap",
    symbol: SYMBOL,
    fromToken: "WETH",
    toToken: "USDC.SG",
    amountWeth: formatEther(SWAP_AMOUNT),
    requestId: submitted.requestId,
    submitted,
    createOrderReceipt: {
      txHash: createOrderTx.hash,
      blockNumber: createOrderReceipt?.blockNumber,
      gasUsed: createOrderReceipt?.gasUsed?.toString(),
      status: createOrderReceipt?.status === 1 ? "success" : "failed",
    },
    status,
    txHash,
    explorerUrl: txHash ? `https://sepolia.arbiscan.io/tx/${txHash}` : null,
    setupTxs: txs,
    balances: {
      before: {
        eth: formatEther(before.eth),
        weth: formatEther(before.weth),
        usdcSg: formatUnits(before.usdcSg, 6),
        allowanceWethToRouter: formatEther(before.allowance),
      },
      after: {
        eth: formatEther(after.eth),
        weth: formatEther(after.weth),
        usdcSg: formatUnits(after.usdcSg, 6),
        allowanceWethToRouter: formatEther(after.allowance),
      },
    },
    preparedSummary: {
      payloadType: prepared.payloadType,
      mode: prepared.mode,
      requestId: prepared.requestId,
      to: prepared.payload.to,
      value: prepared.payload.value,
      gasLimit: prepared.payload.gasLimit,
      executionFeeAmount: prepared.estimates?.executionFeeAmount?.toString(),
    },
  };

  await mkdir("proofs", { recursive: true });
  await writeFile(path.join("proofs", "arbitrum-gmx-live-proof.json"), `${json(proof)}\n`);
  await mkdir(path.join("apps", "frontend", "public", "proofs"), { recursive: true });
  await writeFile(path.join("apps", "frontend", "public", "proofs", "arbitrum-gmx-live-proof.json"), `${json(proof)}\n`);

  console.log(json(proof));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
