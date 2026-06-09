"use client";

import { useCallback, useEffect, useState } from "react";
import { getAddress } from "ethers";
import { friendlyWalletError } from "@/components/primitives/AsyncButton";
import { ARBITRUM_CHAIN_ID_HEX } from "@arbitrum/lib/arbitrum";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type WalletSupabaseAuth = {
  email: string;
  tokenHash: string;
  type: "email";
};

export type WalletConnectResult = {
  address: string;
  supabaseAuth?: WalletSupabaseAuth;
};

type WalletConnectAction = {
  readonly connectWallet: () => Promise<WalletConnectResult>;
  readonly connected: boolean;
  readonly connecting: boolean;
  readonly errorMessage: string | null;
  readonly label: string;
  readonly publicKeyBase58: string | null;
  readonly selectedWalletName: string | null;
};

const sessionKey = "arcpay-arbitrum-wallet-session";

export function useWalletConnectAction(): WalletConnectAction {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(sessionKey);
    if (stored) setAddress(stored);
  }, []);

  const connectWallet = useCallback(async (): Promise<WalletConnectResult> => {
    if (connecting) throw new Error("A wallet request is already pending.");
    if (address) return { address };

    try {
      setConnecting(true);
      setErrorMessage(null);
      const provider = getProvider();
      if (!provider) {
        throw new Error("Install or unlock an EVM wallet to connect to Arbitrum.");
      }

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: ARBITRUM_CHAIN_ID_HEX,
          chainName: "Arbitrum Sepolia",
          nativeCurrency: { name: "Arbitrum Test Token", symbol: "ETH", decimals: 18 },
          rpcUrls: [process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc"],
          blockExplorerUrls: ["https://sepolia.arbiscan.io"],
        }],
      }).catch(async () => {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARBITRUM_CHAIN_ID_HEX }] });
      });

      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const nextAddress = getAddress(accounts[0] ?? "");
      const challenge = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: nextAddress }),
      });
      const challengeBody = await challenge.json() as { message?: string; error?: string };
      if (!challenge.ok || !challengeBody.message) throw new Error(challengeBody.error ?? "Unable to create wallet challenge.");

      const signature = await provider.request({
        method: "personal_sign",
        params: [challengeBody.message, nextAddress],
      }) as string;
      const verified = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature }),
      });
      const verifiedBody = await verified.json() as { address?: string; error?: string; supabaseAuth?: WalletSupabaseAuth };
      if (!verified.ok || !verifiedBody.address) throw new Error(verifiedBody.error ?? "Wallet signature verification failed.");

      window.localStorage.setItem(sessionKey, nextAddress);
      setAddress(nextAddress);
      return { address: nextAddress, supabaseAuth: verifiedBody.supabaseAuth };
    } catch (error) {
      const message = friendlyWalletError(error);
      setErrorMessage(message);
      console.warn("Arbitrum wallet connection failed.", message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [address, connecting]);

  return {
    connectWallet,
    connected: Boolean(address),
    connecting,
    errorMessage,
    label: address ? short(address) : connecting ? "Connecting..." : "Connect wallet",
    publicKeyBase58: address,
    selectedWalletName: "Arbitrum EVM",
  };
}

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

function short(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
