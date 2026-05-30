import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";

const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);
const arbiscanApiUrl = process.env.ARBISCAN_API_URL ?? "https://api.etherscan.io/v2/api?chainid=421614";
const arbiscanBrowserUrl = process.env.ARBITRUM_EXPLORER_URL ?? "https://sepolia.arbiscan.io";
const etherscanApiKey = process.env.ETHERSCAN_API_KEY ?? process.env.ARBISCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arbitrumTestnet: {
      url: process.env.ARBITRUM_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: Number(process.env.ARBITRUM_CHAIN_ID ?? 421614),
      accounts: privateKey ? [privateKey] : [],
      timeout: 120000,
    },
  },
  etherscan: {
    apiKey: etherscanApiKey,
    customChains: [
      {
        network: "arbitrumTestnet",
        chainId: Number(process.env.ARBITRUM_CHAIN_ID ?? 421614),
        urls: {
          apiURL: arbiscanApiUrl,
          browserURL: arbiscanBrowserUrl,
        },
      },
    ],
  },
};

export default config;

function normalizePrivateKey(value: string | undefined): string | undefined {
  const key = value?.trim();
  if (!key || key === "0xYOUR_DEPLOYER_PRIVATE_KEY") {
    return undefined;
  }
  return /^0x[0-9a-fA-F]{64}$/.test(key) ? key : undefined;
}
