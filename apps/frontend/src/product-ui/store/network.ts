import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NetworkMode = "arbitrum";

type NetworkState = {
  mode: NetworkMode;
  setMode: (mode: NetworkMode) => void;
};

export const useNetwork = create<NetworkState>()(
  persist(
    (set) => ({
      mode: "arbitrum",
      setMode: () => set({ mode: "arbitrum" }),
    }),
    {
      name: "arcpay-arbitrum-network",
      version: 1,
      partialize: () => ({ mode: "arbitrum" as const }),
    },
  ),
);
