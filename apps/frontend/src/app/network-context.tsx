"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type ArcPayNetwork = "arbitrum";

interface NetworkContextValue {
  readonly network: ArcPayNetwork;
  readonly endpoint: string;
  readonly setNetwork: (network: ArcPayNetwork) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkModeProvider({ children }: { readonly children: ReactNode }) {
  const value = useMemo<NetworkContextValue>(() => ({
    network: "arbitrum",
    endpoint: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
    setNetwork() {
      // Arbitrum build is intentionally fixed to the Arbitrum Sepolia.
    },
  }), []);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkMode(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) {
    throw new Error("useNetworkMode must be used inside NetworkModeProvider.");
  }

  return value;
}
