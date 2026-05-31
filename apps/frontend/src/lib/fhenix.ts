export const FHENIX_ARBITRUM_SEPOLIA = {
  chainId: 421614,
  network: "arbitrum-sepolia",
  docs: "https://cofhe-docs.fhenix.zone/fhe-library/introduction/quick-start",
  source: "Fhenix CoFHE docs list Arbitrum Sepolia as a supported testnet for FHE smart contracts.",
  packages: ["@cofhe/sdk", "@cofhe/hardhat-plugin", "@fhenixprotocol/cofhe-contracts"],
  taskManager: "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9",
  liveProof: {
    contract: "0xC9e4a3f86FD0771f657eA5dFE01d9E0e726e30D1",
    deployTxHash: "0xf35c22d52c88452cb9dbf8811faaa3f3014b2dce2efc02e5840612ec4fa1133d",
    recordTxHash: "0x988ba57a8bd2d3ec0167a306ed7a6b910bc504d5cf51d6568e2edcc9511cfd1a",
    proofUrl: "/proofs/arbitrum-fhenix-live-proof.json",
    explorerUrl: "https://sepolia.arbiscan.io/tx/0x988ba57a8bd2d3ec0167a306ed7a6b910bc504d5cf51d6568e2edcc9511cfd1a",
  },
} as const;
